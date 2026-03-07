"""
Event Model for SyncCore API.

An Event defines the schema and validation rules for a type of event
that machines can emit. Events are scoped to an Organization and define
what values are valid for events of that type.

Database: PostgreSQL table 'event_classes'
"""

from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.config.api.base import APIBaseModel, TimestampMixin
from models.config.event_config import EventType


class EventBase(APIBaseModel):
    """
    Base fields for Event.
    """

    name: str = Field(
        ...,
        alias="event",
        min_length=1,
        max_length=100,
        description="Event identifier (e.g., 'power', 'execution', 'temperature')",
        examples=["power", "execution", "op_code", "temperature"],
    )
    event_type: EventType = Field(
        ...,
        alias="type",
        description="Data type of the event value",
    )
    authenticate: bool = Field(
        default=False,
        description="Whether incoming event values are validated against auth_values or values_range",
    )
    counter: bool = Field(
        default=False,
        description="Whether this event acts as a counter (increments on each occurrence)",
    )
    remove_duplicates: bool = Field(
        default=False,
        description="Whether consecutive duplicate values are discarded",
    )

    model_config = ConfigDict(populate_by_name=True)


class EventCreate(EventBase):
    """
    Schema for creating a new event.
    """

    auth_values: list[str] | None = Field(
        default=None,
        description="Allowed values for STR type events (used when authenticate=True)",
        examples=[["RUN", "STOP", "IDLE"]],
    )
    values_range: tuple[float, float] | None = Field(
        default=None,
        description="Min/max range for FLOAT/INT type events (used when authenticate=True)",
        examples=[(0, 200), (4, 20)],
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Description of this event",
    )

    @model_validator(mode="after")
    def validate_type_specific_fields(self) -> "EventCreate":
        if self.event_type in (EventType.FLOAT, EventType.INTEGER) and self.auth_values:
            raise ValueError("auth_values should only be used with STR type")
        if self.event_type == EventType.STRING and self.values_range:
            raise ValueError("values_range should only be used with FLOAT/INT types")
        return self


class EventUpdate(BaseModel):
    """
    Schema for updating an existing event.
    """

    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

    name: str | None = Field(default=None, alias="event", min_length=1, max_length=100)
    event_type: EventType | None = Field(default=None, alias="type")
    authenticate: bool | None = Field(default=None)
    counter: bool | None = Field(default=None)
    remove_duplicates: bool | None = Field(default=None)
    auth_values: list[str] | None = Field(default=None)
    values_range: tuple[float, float] | None = Field(default=None)
    description: str | None = Field(default=None)


class Event(EventBase, TimestampMixin):
    """
    Complete Event model as returned from the API.
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the event",
    )
    organization_id: UUID = Field(
        ...,
        description="ID of the parent organization",
    )
    auth_values: list[str] | None = Field(
        default=None,
        description="Allowed values for STR type events",
    )
    values_range: tuple[float, float] | None = Field(
        default=None,
        description="Min/max range for FLOAT/INT type events",
    )
    description: str | None = Field(
        default=None,
        description="Description of this event",
    )
    machine_count: int = Field(
        default=0,
        ge=0,
        description="Number of machines using this event",
    )
    events_last_24h: int = Field(
        default=0,
        ge=0,
        description="Events of this type in last 24 hours",
    )


class EventList(BaseModel):
    """
    Response model for listing events.
    """

    items: list[Event] = Field(description="List of events")
    total: int = Field(ge=0, description="Total number of events")
    organization_id: UUID = Field(description="Parent organization ID")


class EventBulkCreate(BaseModel):
    """
    Schema for bulk creating/replacing events.
    """

    events: list[EventCreate] = Field(
        ...,
        description="List of events to create",
    )
    replace_existing: bool = Field(
        default=True,
        description="Whether to replace all existing events",
    )
