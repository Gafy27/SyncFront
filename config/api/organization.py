"""
Organization Model for SyncCore API.

An Organization represents a tenant in the multi-tenant SyncCore platform.
Each organization has isolated data, applications, users, and connectors.

Database: PostgreSQL table 'organizations'
"""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator, model_validator

from models.config.api.base import APIBaseModel, TimestampMixin, generate_slug


class OrganizationStatus(str, Enum):
    """Status of an organization."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class OrganizationSettings(BaseModel):
    """
    Organization-level settings and preferences.

    These settings apply to all applications within the organization.
    """
    features: dict[str, bool] = Field(
        default_factory=lambda: {
            "alerts_enabled": True,
            "export_enabled": True,
            "api_access": True,
        },
        description="Feature flags for the organization",
    )


class OrganizationBase(APIBaseModel):
    """
    Base fields for Organization, shared across create/update/read operations.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable name of the organization",
        examples=["Acme Manufacturing"],
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Description of the organization",
        examples=["Industrial manufacturing company specializing in CNC machines"],
    )



class OrganizationCreate(OrganizationBase):
    """
    Schema for creating a new organization.

    The slug is auto-generated from the name if not provided.
    """

    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-friendly identifier. Auto-generated from name if not provided.",
        examples=["acme-manufacturing"],
    )
    status: OrganizationStatus = Field(
        default=OrganizationStatus.ACTIVE,
        description="Initial status of the organization",
    )
    settings: OrganizationSettings | None = Field(
        default=None,
        description="Organization settings. Uses defaults if not provided.",
    )

    @model_validator(mode="before")
    @classmethod
    def generate_slug_if_missing(cls, data: Any) -> Any:
        """Auto-generate slug from name if not provided."""
        if isinstance(data, dict):
            if not data.get("slug") and data.get("name"):
                data["slug"] = generate_slug(data["name"])
        return data

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, v: Any) -> str | None:
        """Normalize slug to lowercase."""
        if isinstance(v, str):
            return v.lower().replace(" ", "-").replace("_", "-")
        return v


class OrganizationUpdate(BaseModel):
    """
    Schema for updating an existing organization.

    All fields are optional; only provided fields are updated.
    """

    model_config = ConfigDict(use_enum_values=True)

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Human-readable name of the organization",
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Description of the organization",
    )
    status: OrganizationStatus | None = Field(
        default=None,
        description="Organization status",
    )
    settings: OrganizationSettings | None = Field(
        default=None,
        description="Organization settings",
    )


class Organization(OrganizationBase, TimestampMixin):
    """
    Complete Organization model as returned from the API.

    Includes all fields from the database plus computed properties.
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the organization",
    )
    slug: str = Field(
        ...,
        description="URL-friendly identifier",
    )
    status: OrganizationStatus = Field(
        default=OrganizationStatus.ACTIVE,
        description="Current status of the organization",
    )
    settings: OrganizationSettings = Field(
        default_factory=OrganizationSettings,
        description="Organization settings and preferences",
    )

    # Computed fields (populated by API/repository)
    application_count: int = Field(
        default=0,
        ge=0,
        description="Number of applications in this organization",
    )
    user_count: int = Field(
        default=0,
        ge=0,
        description="Number of users in this organization",
    )
    machine_count: int = Field(
        default=0,
        ge=0,
        description="Total number of machines across all applications",
    )


class OrganizationStats(BaseModel):
    """
    Statistics and metrics for an organization.
    """

    organization_id: UUID = Field(description="Organization ID")
    organization_name: str = Field(description="Organization name")
    application_count: int = Field(ge=0, description="Number of applications")
    total_machines: int = Field(ge=0, description="Total machines across all applications")
    total_users: int = Field(ge=0, description="Total users")
    total_connectors: int = Field(ge=0, description="Total connectors")
    applications: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of applications with their machine counts",
    )
    storage_used_mb: float = Field(
        default=0.0,
        ge=0,
        description="Storage used in megabytes",
    )
    events_last_24h: int = Field(
        default=0,
        ge=0,
        description="Events processed in the last 24 hours",
    )


class OrganizationList(BaseModel):
    """
    Response model for listing organizations.
    """

    items: list[Organization] = Field(description="List of organizations")
    total: int = Field(ge=0, description="Total number of organizations")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")
