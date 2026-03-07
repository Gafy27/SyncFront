import os
import sys

# Add project root to path before importing project modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import logging
from typing import Any

from pydantic import BaseModel, Field, model_validator

from models.config.bridge_config import BridgeConfig
from models.config.event_config import EventConfig
from models.config.service_config import ServiceConfig
from models.config.workflow_config import WorkflowConfig

logger = logging.getLogger(__name__)
from bridges.dbs.file import YamlBridge
from bridges.obj_store import ObjectStorageBridge
from models.config.exceptions import ConfigNotFoundError, InvalidConfigError, OutdatedConfigError
from models.flex import Flex


class PipelineConfig(BaseModel):
    """
    Complete pipeline configuration model that validates all configuration sections.
    Combines workflows, bridges (internal and external), events, and services.
    """

    model_config = {"populate_by_name": True}

    workflow: WorkflowConfig = Field(description="Streaming and batch workflow configurations")
    bridge: BridgeConfig = Field(description="External bridge configurations")
    internal_bridge: BridgeConfig = Field(description="Internal bridge configurations")
    event: EventConfig = Field(description="Event configurations")
    service: ServiceConfig = Field(description="Service configurations")

    @model_validator(mode="before")
    @classmethod
    def transform_config_sections(cls, data: Any) -> Any:
        """
        Transform and validate each section of the pipeline configuration.
        Uses existing validation models for each section.

        If the data is already in processed form (from model_dump), skip transformation.
        """
        if not isinstance(data, dict):
            raise ValueError(f"Invalid config, input data type is not a dictionary: {type(data)}")

        # Detect if data is from model_dump() by checking for processed field names
        is_from_model_dump = "workflow" in data and isinstance(data.get("workflow"), WorkflowConfig)
        if is_from_model_dump:
            return data

        transformed_data = {}

        # Validate workflow section (new unified format)
        if "workflow" in data:
            workflow_config = WorkflowConfig.from_dict(data["workflow"])
            transformed_data["workflow"] = workflow_config
        elif "rules" in data or "computer" in data:
            # Legacy: build workflow from separate rules + computer sections
            rules_data = data.get("rules", {})
            computer_data = data.get("computer", {})
            # rules_data has {"pipelines": {...}}, computer_data has {"workflows": {...}}
            workflow_config = WorkflowConfig.from_dict({
                "streaming": {},
                "batch": computer_data.get("workflows", {}),
            })
            # Also parse pipelines from rules
            if rules_data:
                rules_workflow = WorkflowConfig.from_dict(rules_data)
                workflow_config.streaming.update(rules_workflow.streaming)
            transformed_data["workflow"] = workflow_config
        else:
            transformed_data["workflow"] = WorkflowConfig()

        # Validate bridge section (external bridges)
        if "bridge" in data:
            bridge_config = BridgeConfig.from_dict(data["bridge"])
            transformed_data["bridge"] = bridge_config

        # Validate internal_bridge section (internal bridges)
        if "internal_bridge" in data:
            internal_bridge_config = BridgeConfig.from_dict(data["internal_bridge"], internal=True)
            transformed_data["internal_bridge"] = internal_bridge_config

        # Validate event section (new format)
        if "event" in data:
            event_config = EventConfig.from_dict(data["event"])
            transformed_data["event"] = event_config
        elif "class" in data:
            # Legacy: "class" key maps to event config
            event_config = EventConfig.from_dict(data["class"])
            transformed_data["event"] = event_config
        else:
            transformed_data["event"] = EventConfig(events={})

        # Validate service section
        if "service" in data:
            service_config = ServiceConfig.from_dict(data["service"])
            transformed_data["service"] = service_config

        return transformed_data

    @classmethod
    def from_dict(cls, config_dict: dict) -> "PipelineConfig":
        """
        Create PipelineConfig instance from dictionary.
        Validates all sections using their respective models.

        Args:
            config_dict: Dictionary containing all pipeline configuration sections

        Returns:
            Validated PipelineConfig instance
        """
        return cls.model_validate(config_dict)

    @property
    def services(self):
        """Direct access to services dictionary"""
        return Flex(self.service.service)

    @property
    def storage(self):
        """Direct access to storage configuration"""
        return Flex(self.service.storage)

    @property
    def topics(self):
        """Direct access to topics configuration"""
        return self.service.topics

    @property
    def external_bridges(self):
        """Direct access to external bridges dictionary"""
        return Flex(self.bridge.bridges)

    @property
    def internal_bridges(self):
        """Direct access to internal bridges dictionary"""
        return Flex(self.internal_bridge.bridges)

    @property
    def streaming_workflows(self):
        """Direct access to streaming workflows dictionary"""
        return self.workflow.streaming

    @property
    def batch_workflows(self):
        """Direct access to batch workflows dictionary"""
        return Flex(self.workflow.batch)

    @property
    def events(self):
        """Direct access to events dictionary"""
        return Flex(self.event.events)

    @classmethod
    def update_pipeline_config(cls, storer: ObjectStorageBridge) -> "PipelineConfig":
        pipeline_config = {}
        config_files = YamlBridge.list_files("config")

        for config_file in config_files:
            try:
                file_name = config_file.split(".")[0]
                config_data = YamlBridge.read_yaml("config/" + config_file)
                pipeline_config[file_name] = config_data
            except Exception as e:
                raise ConfigNotFoundError(f"Failed to load configuration file {config_file}: {e}") from e

        try:
            storer.write("pipeline_config", "config", pipeline_config)
        except Exception as e:
            raise OutdatedConfigError(str(e)) from e

        try:
            return cls.from_dict(pipeline_config)
        except Exception as e:
            raise InvalidConfigError(str(e)) from e

    @classmethod
    def from_storage(cls, storer: ObjectStorageBridge) -> "PipelineConfig":
        try:
            pipeline_config = storer.read("pipeline_config", "config")
            return cls.from_dict(pipeline_config)
        except Exception as e:
            raise ConfigNotFoundError(str(e)) from e
