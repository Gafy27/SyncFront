"""
Machine Model for SyncCore API.

A Machine represents a physical machine or sensor that sends data to the
SyncCore platform. Machines belong to an Organization and reference events
by name and bridges by name.

Database: PostgreSQL table 'machines'
"""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from models.config.api.base import APIBaseModel, TimestampMixin


class MachineStatus(str, Enum):
    """Status of a machine."""

    ONLINE = "online"
    OFFLINE = "offline"
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    UNKNOWN = "unknown"


class MachineProperties(BaseModel):
    """
    Machine properties and metadata.

    These are static properties that describe the machine.
    """

    manufacturer: str | None = Field(
        default=None,
        description="Machine manufacturer",
        examples=["Fanuc", "Siemens", "Haas"],
    )


class MachineBase(APIBaseModel):
    """
    Base fields for Machine.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable name of the machine",
        examples=["CNC Machine #1", "Oil Pump Sensor"],
    )


class MachineCreate(MachineBase):
    """
    Schema for creating a new machine.
    """

    organization_id: UUID | None = Field(
        default=None,
        description="ID of the parent organization (optional, inferred from path)",
    )
    bridges: list[str] = Field(
        default_factory=list,
        description="List of bridge names associated with this machine",
    )
    events: list[str] = Field(
        default_factory=list,
        description="Event names this machine can emit",
    )
    properties: MachineProperties | None = Field(
        default=None,
        description="Machine properties and metadata",
    )


class MachineUpdate(BaseModel):
    """
    Schema for updating an existing machine.
    """

    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    status: MachineStatus | None = Field(default=None)
    bridges: list[str] | None = Field(default=None)
    events: list[str] | None = Field(default=None)
    properties: MachineProperties | None = Field(default=None)


class Machine(MachineBase, TimestampMixin):
    """
    Complete Machine model as returned from the API.
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the machine",
    )
    organization_id: UUID = Field(
        ...,
        description="ID of the parent organization",
    )
    status: MachineStatus = Field(
        default=MachineStatus.UNKNOWN,
        description="Current status of the machine",
    )
    bridges: list[str] = Field(
        default_factory=list,
        description="List of bridge names",
    )
    events: list[str] = Field(
        default_factory=list,
        description="Event names this machine can emit",
    )
    properties: MachineProperties = Field(
        default_factory=MachineProperties,
        description="Machine properties and metadata",
    )

    last_seen: datetime | None = Field(
        default=None,
        description="Last time data was received from this machine",
    )
    events_today: int = Field(
        default=0,
        ge=0,
        description="Events received today",
    )


class MachineList(BaseModel):
    """
    Response model for listing machines.
    """

    items: list[Machine] = Field(description="List of machines")
    total: int = Field(ge=0, description="Total number of machines")
    organization_id: UUID = Field(description="Parent organization ID")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")


class MachineSummary(BaseModel):
    """
    Minimal machine info for references.
    """

    id: UUID = Field(description="Machine ID")
    name: str = Field(description="Machine name")
    status: MachineStatus = Field(description="Current status")
