"""
Connector Template Model for SyncCore API.

A ConnectorTemplate defines the schema and configuration options for a type
instances with specific configurations.

Examples of templates: MTConnect, OPC-UA, Modbus, MQTT, REST API

Database: PostgreSQL table 'connector_templates'
"""

from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.config.api.base import APIBaseModel, TimestampMixin, generate_slug


class VariableType(str, Enum):
    """Data types for template variables."""

    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    SECRET = "secret"  # For passwords, tokens, etc.
    URL = "url"
    PORT = "port"
    PATH = "path"
    ENUM = "enum"


class TemplateVariable(BaseModel):
    """
    Definition of a configuration variable in a connector template.

    Variables define what configuration options are available when
    creating a connector instance from this template.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_]*$",
        description="Variable name (snake_case)",
        examples=["host", "port", "api_key"],
    )
    label: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Human-readable label for the variable",
        examples=["Host Address", "Port Number", "API Key"],
    )
    type: VariableType = Field(
        ...,
        description="Data type of the variable",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Description of what this variable configures",
    )
    required: bool = Field(
        default=False,
        description="Whether this variable is required",
    )
    default: Any = Field(
        default=None,
        description="Default value for the variable",
    )
    placeholder: str | None = Field(
        default=None,
        description="Placeholder text for input fields",
    )
    validation: dict[str, Any] | None = Field(
        default=None,
        description="Validation rules (min, max, pattern, enum values, etc.)",
        examples=[
            {"min": 1, "max": 65535},
            {"pattern": r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"},
            {"enum": ["TCP", "UDP"]},
        ],
    )
    group: str | None = Field(
        default=None,
        description="Group name for organizing variables in UI",
        examples=["Connection", "Authentication", "Advanced"],
    )
    order: int = Field(
        default=0,
        ge=0,
        description="Display order within the group",
    )
    depends_on: str | None = Field(
        default=None,
        description="Variable name this depends on (for conditional display)",
    )
    depends_on_value: Any = Field(
        default=None,
        description="Value the dependency must have for this to be shown",
    )




class ConnectorTemplateBase(APIBaseModel):
    """
    Base fields for ConnectorTemplate.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable name of the template",
        examples=["MTConnect Adapter", "OPC-UA Client", "Modbus TCP"],
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Detailed description of the connector template",
    )
    version: str = Field(
        default="1.0.0",
        pattern=r"^\d+\.\d+\.\d+$",
        description="Template version (semver)",
    )
    icon: str | None = Field(
        default=None,
        description="Icon name or URL for the template",
    )
    documentation_url: str | None = Field(
        default=None,
        description="URL to documentation",
    )


class ConnectorTemplateCreate(ConnectorTemplateBase):
    """
    Schema for creating a new connector template.
    """

    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-friendly identifier. Auto-generated from name if not provided.",
    )
    variables: list[TemplateVariable] = Field(
        default_factory=list,
        description="Configuration variables for this template",
    )

    tags: list[str] = Field(
        default_factory=list,
        description="Tags for categorization and search",
        examples=[["industrial", "mtconnect", "cnc"]],
    )
    is_public: bool = Field(
        default=False,
        description="Whether this template is publicly available",
    )
    organization_id: UUID | None = Field(
        default=None,
        description="Organization that owns this template. Null for system templates.",
    )

    @model_validator(mode="before")
    @classmethod
    def generate_slug_if_missing(cls, data: Any) -> Any:
        """Auto-generate slug from name if not provided."""
        if isinstance(data, dict):
            if not data.get("slug") and data.get("name"):
                data["slug"] = generate_slug(data["name"])
        return data


class ConnectorTemplateUpdate(BaseModel):
    """
    Schema for updating an existing connector template.
    """

    model_config = ConfigDict(use_enum_values=True)

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    version: str | None = Field(
        default=None,
        pattern=r"^\d+\.\d+\.\d+$",
    )
    icon: str | None = Field(default=None)
    documentation_url: str | None = Field(default=None)
    variables: list[TemplateVariable] | None = Field(default=None)
    tags: list[str] | None = Field(default=None)
    is_public: bool | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class ConnectorTemplate(ConnectorTemplateBase, TimestampMixin):
    """
    Complete ConnectorTemplate model as returned from the API.
    """

    id: UUID = Field(
        default_factory=uuid4,
        description="Unique identifier for the template",
    )
    slug: str = Field(
        ...,
        description="URL-friendly identifier",
    )
    variables: list[TemplateVariable] = Field(
        default_factory=list,
        description="Configuration variables for this template",
    )

    tags: list[str] = Field(
        default_factory=list,
        description="Tags for categorization",
    )
    is_public: bool = Field(
        default=False,
        description="Whether this template is publicly available",
    )
    is_active: bool = Field(
        default=True,
        description="Whether this template is active and available for use",
    )
    organization_id: UUID | None = Field(
        default=None,
        description="Organization that owns this template. Null for system templates.",
    )

    # Computed fields
    connector_count: int = Field(
        default=0,
        ge=0,
        description="Number of connectors using this template",
    )


class ConnectorTemplateList(BaseModel):
    """
    Response model for listing connector templates.
    """

    items: list[ConnectorTemplate] = Field(description="List of templates")
    total: int = Field(ge=0, description="Total number of templates")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")


class ConnectorTemplateSummary(BaseModel):
    """
    Minimal template info for dropdowns and references.
    """

    id: UUID = Field(description="Template ID")
    slug: str = Field(description="Template slug")
    name: str = Field(description="Template name")
    icon: str | None = Field(default=None, description="Icon")
