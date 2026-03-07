from typing import Any

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from models.config.bridge_model import BNetwork, Environment
from models.config.exceptions import InvalidConfigError


class EnvironmentConfig(BaseSettings):
    """
    Environment configuration loaded from environment variables.
    Reads SYNC_ENVIRONMENT and SYNC_NETWORK from .env file or environment.

    Environment variables:
        SYNC_ENVIRONMENT: Environment to filter bridges by (prod, dev)
        SYNC_INTERNAL: Boolean flag (true/false) to filter by internal bridges
    """

    auth0_client_secret: str = Field(default="", description="Auth0 secret to filter bridges by")
    environment: Environment = Field(description="Environment to filter bridges by (prod, dev)")
    network: BNetwork = Field(
        default=BNetwork.LOCAL,
        description="Filter by network flag. If DOCKER, only include bridges on docker network. If LOCAL, exclude bridges on docker network.",
    )
    startup_storage: str | None = Field(default=None, description="Startup storage to filter bridges by")
    debug_breakpoints: bool = Field(default=False, description="Debug breakpoint to pause on startup")
    model_config = SettingsConfigDict(
        env_prefix="SYNC_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_parse_enums=True,
        extra="ignore",
    )

    @model_validator(mode="before")
    @classmethod
    def parse_environment(cls, data: Any) -> Any:
        """Parse environment string to Environment enum"""
        if not isinstance(data, dict):
            raise ValueError(f"Invalid environment config, input data type is not a dictionary: {type(data)}")
        if "environment" in data:
            env_value = data["environment"]
            if isinstance(env_value, str):
                # Try to match enum value (case-insensitive)
                env_lower = env_value.lower()
                for env_enum in Environment:
                    if env_enum.value.lower() == env_lower:
                        data["environment"] = env_enum.value
                        break
        else:
            raise InvalidConfigError(f"Invalid environment config, 'environment' key not found in dictionary: {data}")
        return data
