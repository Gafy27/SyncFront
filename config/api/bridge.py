"""
Bridge Model for SyncCore API.

A Bridge is a configured connection instance for a specific protocol or service
(e.g., an OPC-UA server at 192.168.1.5, an MQTT broker at 10.0.0.1).
Bridges are scoped to an Organization and referenced by Machines by name.

The Bridge type is authoritative from the processing config layer (BType).
The Bridge config holds the actual variable values (host, port, credentials, etc.)
defined by the associated ConnectorTemplate variables.

Database: PostgreSQL table 'bridges'
"""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from models.config.api.base import APIBaseModel, TimestampMixin
from models.config.bridge_model import BType


class BridgeStatus(str, Enum):
    """Runtime connectivity status of a bridge."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    UNKNOWN = "unknown"


# Re-export so callers can import BridgeType from this module
BridgeType = BType

__all__ = [
    "BridgeType",
    "BridgeStatus",
    "BridgeBase",
    "BridgeCreate",
    "BridgeUpdate",
    "Bridge",
    "BridgeList",
]


class BridgeBase(APIBaseModel):
    """
    Base fields for a Bridge instance.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Unique name for this bridge within the organization. Referenced by machines.",
        examples=["opcua-main", "mqtt-plant-floor", "influx-historian"],
    )
    type: BType = Field(
        ...,
        description="Protocol / driver type of this bridge",
        examples=["mqtt", "opcua", "postgresql", "influxdb"],
    )
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Actual configuration values for this bridge (host, port, credentials, etc.)",
        examples=[
            {"host": "192.168.1.5", "port": 4840},
            {"host": "mqtt.plant.local", "port": 1883, "topics": ["machines/#"]},
        ],
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Human-readable description of this bridge",
    )
    is_enabled: bool = Field(
        default=True,
        description="Whether this bridge is enabled",
    )


class BridgeCreate(BridgeBase):
    """
    Schema for creating a new bridge.
    """

    template_id: UUID | None = Field(
        default=None,
        description="ID of the ConnectorTemplate this bridge is based on (optional)",
    )


class BridgeUpdate(BaseModel):
    """
    Schema for updating an existing bridge.
    """

    model_config = ConfigDict(use_enum_values=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    config: dict[str, Any] | None = Field(default=None)
    description: str | None = Field(default=None)
    is_enabled: bool | None = Field(default=None)


class Bridge(BridgeBase, TimestampMixin):
    """
    Complete Bridge model as returned from the API.
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the bridge",
    )
    organization_id: UUID = Field(
        ...,
        description="ID of the parent organization",
    )
    template_id: UUID | None = Field(
        default=None,
        description="ID of the ConnectorTemplate this bridge is based on",
    )
    status: BridgeStatus = Field(
        default=BridgeStatus.UNKNOWN,
        description="Current runtime connectivity status",
    )
    last_connected: datetime | None = Field(
        default=None,
        description="Last time a successful connection was established",
    )
    machine_count: int = Field(
        default=0,
        ge=0,
        description="Number of machines referencing this bridge",
    )


class BridgeList(BaseModel):
    """
    Response model for listing bridges.
    """

    items: list[Bridge] = Field(description="List of bridges")
    total: int = Field(ge=0, description="Total number of bridges")
    organization_id: UUID = Field(description="Parent organization ID")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")
