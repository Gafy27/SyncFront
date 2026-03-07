import logging
from typing import Any, Union

from pydantic import BaseModel, Field, ValidationError, model_validator

from models.config.bridge_model import VALIDATED_BRIDGE_MODELS, VALIDATION_ORDER, BNetwork, BType
from models.config.env_config import EnvironmentConfig
from models.config.exceptions import InvalidConfigError

logger = logging.getLogger(__name__)

_bridge_types = tuple(VALIDATED_BRIDGE_MODELS.values())
BridgeObject = Union.__getitem__(_bridge_types)


class BridgeConfig(BaseModel):
    bridges: dict[str, BridgeObject] = Field()

    @model_validator(mode="before")
    @classmethod
    def validate_bridge_structures(cls, data: Any) -> Any:
        """
        Validate all bridge dictionaries and convert them to Python objects.
        Filters out bridges that don't match the environment from .env file.
        Returns a dictionary with bridge names as keys and bridge objects as values.

        If data is from model_dump() (has "bridges" key with already-processed data),
        return as-is for Pydantic to handle.
        """
        if not isinstance(data, dict):
            raise InvalidConfigError(f"Invalid bridge config, input data type is not a dictionary: {type(data)}")

        # Detect if data is from model_dump() - it would have a "bridges" key
        # containing the already-validated bridges
        if "bridges" in data and len(data) == 1:
            # Data is already processed from model_dump(), return as-is
            return data

        # Get environment from .env file
        try:
            environment_config = EnvironmentConfig()
            current_environment = environment_config.environment
        except Exception as e:
            # If environment config fails, log warning but continue (for testing purposes)
            logger.warning(f"Could not load environment config, skipping environment filtering: {e}")
            current_environment = None

        validated_bridges = {}
        for bridge_name, bridge_data in data.items():
            if isinstance(bridge_data, dict):
                # Validate and instantiate bridge object
                bridge_object = cls._validate_and_instantiate_bridge(bridge_name, bridge_data)

                # Filter by environment if environment config is available
                if current_environment is not None:
                    # Check if bridge is active
                    if not bridge_object.active:
                        continue

                    # Check if bridge matches current environment
                    if current_environment not in bridge_object.environments:
                        logger.debug(
                            f"Skipping bridge '{bridge_name}' - environment '{current_environment}' not in {bridge_object.environments}"
                        )
                        continue
                    if (
                        bridge_object.network != BNetwork.EXTERNAL
                        and bridge_object.network != environment_config.network
                    ):
                        continue

                validated_bridges[bridge_name] = bridge_object
            else:
                raise ValueError(f"Bridge '{bridge_name}' must be a dictionary")
        return {"bridges": validated_bridges}

    @staticmethod
    def _validate_and_instantiate_bridge(bridge_name: str, bridge_data: dict) -> BridgeObject:
        """
        Validate bridge config and instantiate the appropriate bridge object.
        Uses a mapping dictionary for cleaner code.

        Args:
            bridge_name: Name of the bridge
            bridge_data: Dictionary containing bridge configuration

        Returns:
            Instantiated bridge object (MQTTBridge, KafkaBridge, etc.)

        Raises:
            ValueError: If bridge type is unknown or validation fails
        """
        bridge_type = bridge_data.get("type")

        # Try to instantiate using type field if present
        if bridge_type and bridge_type in VALIDATED_BRIDGE_MODELS:
            bridge_model = VALIDATED_BRIDGE_MODELS[bridge_type]
            try:
                return bridge_model.model_validate(bridge_data)
            except ValidationError as e:
                raise ValueError(f"Invalid {bridge_type} bridge '{bridge_name}': {e}") from e

        # Fallback: detect by structure if type field is missing
        # Try each model in order of specificity
        for bridge_model, condition in VALIDATION_ORDER:
            if condition(bridge_data):
                try:
                    return bridge_model.model_validate(bridge_data)
                except ValidationError as e:
                    raise InvalidConfigError(f"Invalid bridge '{bridge_name}' structure: {e}") from e

        raise InvalidConfigError(
            f"Unknown bridge type for '{bridge_name}'. Could not determine bridge type from structure."
        )

    @classmethod
    def from_dict(cls, config_dict: dict, internal: bool | None = False) -> "BridgeConfig":
        """
        Create BridgeConfig instance from dictionary.
        All bridges are validated against their schema during initialization.

        Args:
            config_dict: Dictionary containing bridge configurations

        Returns:
            Validated BridgeConfig instance
        """
        validated_model = cls.model_validate(config_dict)
        return validated_model


def filter_bridges_by_type(
    config: dict[str, BridgeObject], internal: bool | None = False
) -> dict[BType, list[BridgeObject] | BridgeObject]:
    """
    Filter bridges by environment, active status, and optionally by network, then group by bridge type.

    Args:
        config: BridgeConfig instance containing all bridges
        internal: If True, filters by network and returns single bridge per type.
                  If False, returns all matching bridges grouped by type as lists.

    Returns:
        Dictionary with bridge type as key:
        - If internal=False: List of filtered bridge objects per type
        - If internal=True: Single bridge object per type (last matching bridge wins)
        Example: {BType.MQTT: [mqtt_bridge1, mqtt_bridge2], ...} or {BType.MQTT: mqtt_bridge1, ...}
    """
    environment_config = EnvironmentConfig()
    filtered_bridges = []
    # Filter bridges
    for _bridge_name, bridge in config.items():
        # Check active status
        if not bridge.active:
            continue

        # Check environment filter
        if environment_config.environment not in bridge.environments:
            continue

        # Check network filter (only for internal bridges)
        if internal:
            bridge_network = getattr(bridge, "network", BNetwork.LOCAL)
            if bridge_network != environment_config.network:
                continue

        filtered_bridges.append(bridge)

    return map_bridges_by_type(filtered_bridges, internal)


def map_bridges_by_type(
    filtered_bridges: list[BridgeObject], internal: bool
) -> dict[BType, list[BridgeObject] | BridgeObject]:
    # Group by bridge type
    if internal:
        # For internal: return single bridge per type (last one wins)
        bridges_by_type: dict[BType, BridgeObject] = {}
        for bridge in filtered_bridges:
            bridges_by_type[bridge.type] = bridge
        return bridges_by_type
    else:
        # For external: return list of bridges per type
        bridges_by_type: dict[BType, list[BridgeObject]] = {}
        for bridge in filtered_bridges:
            bridge_type = bridge.type
            if bridge_type not in bridges_by_type:
                bridges_by_type[bridge_type] = []
            bridges_by_type[bridge_type].append(bridge)
        return bridges_by_type

