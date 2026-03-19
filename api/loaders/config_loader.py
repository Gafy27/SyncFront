"""
Workflow manager — publishes lifecycle signals to Kafka.

Produces a message to the configured signal_topic whenever the API
receives a start / stop / restart / reset / terminate request for a workflow.

Message format:
    {
        "event_id": "signal",
        "value": "<signal>",
        "target_service": "<workflow_id>",
        "machine_id": "api"
    }
"""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

from bridges.internal import InternalBridge
from bridges.obj_store import ObjectStorageBridge
from models.config.bridge_model import BType
from models.config.pipeline_config import PipelineConfig
from bridges.sql_store import SQLStoreBridge
logger = logging.getLogger(__name__)

class ConfigLoader:
    def __init__(self) -> None:
        self.storer = ObjectStorageBridge(auto=True)
        self._config_topic: str = "config"

    # ------------------------------------------------------------------
    # Internal setup
    # ------------------------------------------------------------------

    def _init_ibridge(self) -> InternalBridge:
        if self._ibridge is not None:
            return self._ibridge

        if not self.storer.strategy.connect():
            raise ConnectionError("ConfigLoader: could not connect to object storage")

        pipeline_config = PipelineConfig.from_storage(self.storer)

        service_config = pipeline_config.services.get("api")
        if not service_config:
            raise ValueError("WorkflowManager: no 'api' entry found in service config")

        broker_config = None
        for bridge in pipeline_config.internal_bridge.bridges.values():
            if bridge.type == service_config.broker:
                broker_config = bridge
                break

        if broker_config is None:
            raise ValueError(
                f"WorkflowManager: no internal bridge of type '{service_config.broker}' found"
            )

        broker_config = broker_config.model_copy(
            update={"consumer_group": service_config.consumer_group}
        )

        if pipeline_config.service.topics:
            self._signal_topic = pipeline_config.service.topics.config_topic

        self._ibridge = InternalBridge(broker_config)
        logger.info(
            f"WorkflowManager: initialized Kafka producer → topic '{self._signal_topic}'"
        )
        return self._ibridge

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def _produce_sync(self, workflow_id: str, signal: str) -> None:
        bridge = self._init_bridge()
        message = json.dumps(
            {
                "event_id": "signal",
                "value": signal,
                "target_workflow": workflow_id,
                "machine_id": "api",
            }
        )
        bridge.producer.produce(
            topic=self._signal_topic,
            key=workflow_id,
            value=message,
        )
        bridge.producer.flush()
        logger.info(f"WorkflowManager: produced '{signal}' signal for workflow {workflow_id}")

    async def produce(self, workflow_id: UUID | str, signal: str) -> None:
        """Publish a lifecycle signal for the given workflow to Kafka."""
        await asyncio.to_thread(self._produce_sync, str(workflow_id), signal)


wf = ConfigLoaderService()
