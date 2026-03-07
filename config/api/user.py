"""
User Model for SyncCore API.

A User represents a person who can have access to multiple Organizations.
Users have roles that determine their permissions in each organization.

Database: PostgreSQL tables 'users' (global) and 'user_organizations' (many-to-many)
"""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr

from models.config.api.base import APIBaseModel, TimestampMixin


class UserRole(str, Enum):
    """User role within an organization."""

    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    API = "api"  # API-only access


class UserStatus(str, Enum):
    """User account status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"  # Invitation sent
    SUSPENDED = "suspended"


class OrganizationMembership(BaseModel):
    """
    Represents a user's membership in an organization.
    """

    organization_id: UUID = Field(description="Organization ID")
    organization_name: str | None = Field(default=None, description="Organization name")
    organization_slug: str | None = Field(default=None, description="Organization slug")
    role: UserRole = Field(description="User's role in this organization")
    status: UserStatus = Field(
        default=UserStatus.ACTIVE,
        description="User status in this organization",
    )
    joined_at: datetime | None = Field(
        default=None,
        description="When the user joined this organization",
    )


class UserBase(APIBaseModel):
    """
    Base fields for User.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="User's full name",
        examples=["John Doe"],
    )
    email: EmailStr = Field(
        ...,
        description="User's email address (globally unique)",
        examples=["john.doe@example.com"],
    )


class UserCreate(UserBase):
    """
    Schema for creating a new user.
    """

    organization_id: UUID | None = Field(
        default=None,
        description="ID of the organization (optional, inferred from path)",
    )
    role: UserRole = Field(
        default=UserRole.VIEWER,
        description="User's role in the organization",
    )
    password: SecretStr | None = Field(
        default=None,
        min_length=8,
        description="Password (if not using SSO)",
    )
    send_invitation: bool = Field(
        default=True,
        description="Whether to send an invitation email",
    )


class UserUpdate(BaseModel):
    """
    Schema for updating an existing user.
    """

    model_config = ConfigDict(use_enum_values=True)

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    email: EmailStr | None = Field(default=None)
    role: UserRole | None = Field(default=None)
    status: UserStatus | None = Field(default=None)


class User(UserBase, TimestampMixin):
    """
    Complete User model as returned from the API.
    Includes organization memberships when retrieved with full context.
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the user",
    )
    # Legacy field - kept for backward compatibility with org-specific routes
    organization_id: UUID | None = Field(
        default=None,
        description="Primary/current organization ID (deprecated, use organizations)",
    )
    role: UserRole | None = Field(
        default=None,
        description="Role in primary organization (deprecated, use organizations)",
    )
    status: UserStatus = Field(
        default=UserStatus.ACTIVE,
        description="Global user account status",
    )
    organizations: list[OrganizationMembership] = Field(
        default_factory=list,
        description="Organizations this user belongs to",
    )
    last_login: datetime | None = Field(
        default=None,
        description="Last login timestamp",
    )




class UserList(BaseModel):
    """
    Response model for listing users.
    """

    items: list[User] = Field(description="List of users")
    total: int = Field(ge=0, description="Total number of users")
    organization_id: UUID | None = Field(
        default=None,
        description="Parent organization ID (if filtered by org)",
    )
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")


class LoginRequest(BaseModel):
    """
    Login request payload.
    """

    email: EmailStr = Field(description="User email")
    password: SecretStr = Field(description="User password")


class LoginResponse(BaseModel):
    """
    Login response with user info and accessible organizations.
    """

    user_id: UUID = Field(description="User ID")
    email: str = Field(description="User email")
    name: str = Field(description="User name")
    organizations: list[OrganizationMembership] = Field(
        description="Organizations the user can access"
    )
    token: str | None = Field(
        default=None,
        description="Authentication token (if using token auth)",
    )
