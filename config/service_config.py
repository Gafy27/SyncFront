from typing import Any

from pydantic import BaseModel, Field, model_validator

from models.config.bridge_model import BType


class SingleService(BaseModel):
    timeout_seconds: int | None = Field(default=30)
    check_interval: int | None = Field(default=5)
    broker: BType = Field()
    consumer_group: str = Field()
    log_level: str = Field()
    offset: str | None = Field(default=None)  # Override broker offset (earliest/latest)
    class_name: str | None = Field(default=None, alias="class")
    model_config = {"populate_by_name": True}


class Topics(BaseModel):
    input_topic: str = Field()
    output_topic: str = Field()
    accepted_topic: str = Field()
    debug_topic: str = Field()
    beacon_topic: str = Field()
    interpreted_topic: str = Field()
    config_topic: str = Field()
    alert_topic: str = Field()

class Storage(BaseModel):
    type: str = Field()


class ServiceConfig(BaseModel):
    service: dict[str, SingleService] = Field()
    topics: Topics | None = Field(default=None)
    storage: Storage = Field()

    @model_validator(mode="before")
    @classmethod
    def transform_service_dict(cls, data: Any) -> Any:
        """
        Transform service dictionary values to SingleService objects before validation.
        Handles two formats:
        1. Old format: {"service": {...}, "topics": {...}, "storage": {...}}
        2. New format: {"service-name": {...}, "storage": {...}} (services at top level)

        If data is from model_dump() (already has "service" key with services dict),
        return as-is for Pydantic to handle.
        """
        if not isinstance(data, dict):
            raise ValueError(f"Invalid service config, input data type is not a dictionary: {type(data)}")

        # Detect if data is from model_dump() - it would have "service", "storage", and optionally "topics" keys
        # The raw config format has service names at the top level, not nested under "service"
        expected_keys = {"service", "storage", "topics"}
        if "service" in data and "storage" in data:
            # All keys are expected model fields, this is from model_dump()
            if set(data.keys()).issubset(expected_keys):
                return data

        # New format: services are at top level, extract them
        # Known non-service keys that should be extracted
        known_keys = {"storage", "topics"}

        transformed_data = {}
        services = {}
        storage_data = None
        topics_data = None

        for key, value in data.items():
            if key == "storage":
                storage_data = value
            elif key == "topics":
                topics_data = value
            elif key not in known_keys:
                # This is a service name
                if isinstance(value, dict):
                    services[key] = value
                else:
                    services[key] = value

        # Reconstruct the data structure
        transformed_data["service"] = services
        if storage_data:
            transformed_data["storage"] = storage_data
        else:
            # Provide default storage if not present
            transformed_data["storage"] = {"type": "redis"}
        if topics_data:
            transformed_data["topics"] = topics_data

        return transformed_data

    @classmethod
    def from_dict(cls, config_dict: dict) -> "ServiceConfig":
        """
        Create Config instance from dictionary.
        Pydantic will automatically validate Dict[str, SingleService] by validating
        each value in the dictionary as a SingleService object.

        Args:
            config_dict: Dictionary containing service, topics, and storage configs

        Returns:
            Validated Config instance
        """
        return cls.model_validate(config_dict)
