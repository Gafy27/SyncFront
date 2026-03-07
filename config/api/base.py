"""
Base models and utilities for API configuration models.

Provides common fields, validators, and patterns used across all API models.
"""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class APIBaseModel(BaseModel):
    """
    Base model for all API entities.

    Provides common configuration for JSON serialization and database mapping.
    """

    model_config = ConfigDict(
        # Use enum values in JSON serialization
        use_enum_values=True,
        # Allow population by field name or alias
        populate_by_name=True,
        # Validate field values on assignment
        validate_assignment=True,
        # Include properties in serialization
        from_attributes=True,
        # JSON serialization settings
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None,
            UUID: lambda v: str(v) if v else None,
        },
    )


class TimestampMixin(BaseModel):
    """Mixin for models that track creation and modification times."""

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the record was created",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the record was last updated",
    )


class IdentifiableMixin(BaseModel):
    """Mixin for models with UUID primary key."""

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the record",
    )


class SlugMixin(BaseModel):
    """Mixin for models with a URL-friendly slug identifier."""

    slug: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-friendly identifier (lowercase alphanumeric with hyphens)",
    )

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, v: Any) -> str:
        """Normalize slug to lowercase and replace spaces/underscores with hyphens."""
        if isinstance(v, str):
            return v.lower().replace(" ", "-").replace("_", "-")
        return v


class StatusEnum(str, Enum):
    """Common status values for entities."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ARCHIVED = "archived"
    DELETED = "deleted"


def generate_slug(name: str) -> str:
    """
    Generate a URL-friendly slug from a name.

    Args:
        name: Human-readable name

    Returns:
        Lowercase slug with hyphens
    """
    import re

    # Convert to lowercase
    slug = name.lower()
    # Replace spaces and underscores with hyphens
    slug = re.sub(r"[\s_]+", "-", slug)
    # Remove non-alphanumeric characters except hyphens
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    # Remove consecutive hyphens
    slug = re.sub(r"-+", "-", slug)
    # Remove leading/trailing hyphens
    slug = slug.strip("-")
    return slug
