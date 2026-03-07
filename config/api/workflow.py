"""
Workflow and Table Models for SyncCore API.

Workflows come in two types:
- Streaming: real-time event-driven pipelines (formerly Pipelines/Rules)
- Batch: windowed computational pipelines using Temporal (formerly Workflows/Tables)

Database: PostgreSQL table 'workflows' and 'workflow_tables'
"""

from datetime import datetime
from enum import Enum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.config.api.base import APIBaseModel, TimestampMixin
from models.config.workflow_config import (
    FunctionConfig as FunctionDefinition,
)
from models.config.workflow_config import (
    FunctionType,
    StreamingTable,
    WindowType,
)

# Re-export shared types so callers can import from this module
__all__ = [
    "FunctionType",
    "FunctionDefinition",
    "StreamingTable",
    "WindowType",
    "WindowConfig",
    "WorkflowType",
    "StreamingWorkflowBase",
    "StreamingWorkflowCreate",
    "StreamingWorkflow",
    "TableBase",
    "TableCreate",
    "TableUpdate",
    "Table",
    "TableList",
    "WorkflowBase",
    "WorkflowCreate",
    "WorkflowUpdate",
    "Workflow",
    "WorkflowList",
    "AnyWorkflowCreate",
    "AnyWorkflow",
]


class WorkflowType(str, Enum):
    """Type of workflow."""

    STREAMING = "streaming"
    BATCH = "batch"


class WindowConfig(BaseModel):
    """
    Window configuration for batch workflow processing.

    For TUMBLING windows: provide `type` and `size`.
    For SLIDING windows: provide `type`, `size`, and `step`.
    For STEPPING windows: provide `type` and `triggers`.
    """

    type: WindowType = Field(..., description="Type of windowing strategy")
    size: str | None = Field(
        default=None,
        description="Window size for tumbling/sliding (e.g., '1m', '5m', '1h')",
    )
    step: str | None = Field(
        default=None,
        description="Step size for sliding windows",
    )
    triggers: list[str] | None = Field(
        default=None,
        description="Events that trigger window boundaries (stepping windows)",
        examples=[["m30"], ["m15", "m30"]],
    )


# =============================================================================
# STREAMING workflow models (formerly Pipeline / Rule)
# =============================================================================


class StreamingWorkflowBase(APIBaseModel):
    """
    Base fields for a StreamingWorkflow.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Workflow name identifier",
        examples=["level_pipeline", "packer_pipeline"],
    )
    type: WorkflowType = Field(
        default=WorkflowType.STREAMING,
        description="Workflow type (always 'streaming' for this model)",
    )
    triggers: list[str] = Field(
        ...,
        min_length=1,
        description="List of events that trigger this workflow",
        examples=[["level_420"], ["PIECES", "EXECUTION", "MODE", "ONLINE"]],
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Description of what this workflow does",
    )
    is_enabled: bool = Field(
        default=True,
        description="Whether the workflow is enabled",
    )


class StreamingWorkflowCreate(StreamingWorkflowBase):
    """
    Schema for creating a new streaming workflow with its tables.
    """

    type: Literal[WorkflowType.STREAMING] = Field(
        default=WorkflowType.STREAMING,
        description="Workflow type (always 'streaming')",
    )
    id: UUID | None = Field(
        default=None,
        description="Custom ID for the workflow. Auto-generated if not provided.",
    )
    tables: list[StreamingTable] = Field(
        default_factory=list,
        description="Tables (computation steps) within this workflow",
    )


class StreamingWorkflow(StreamingWorkflowBase, TimestampMixin):
    """
    Complete StreamingWorkflow model as returned from the API.
    """

    id: UUID = Field(..., description="Workflow identifier")
    organization_id: str = Field(..., description="UUID of the organization")
    tables: list[StreamingTable] = Field(
        default_factory=list,
        description="Tables (computation steps) within this workflow",
    )
    tables_count: int = Field(default=0, ge=0, description="Number of tables in this workflow")
    last_triggered: datetime | None = Field(default=None, description="Last time this workflow was triggered")


# =============================================================================
# BATCH workflow models
# =============================================================================


class TableBase(APIBaseModel):
    """
    Base fields for a Table within a batch workflow.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Table name identifier",
        examples=["cycle", "lot", "execution_duration"],
    )

    function: FunctionDefinition | None = Field(
        default=None,
        description="Function that computes this table's data (required for batch tables)",
    )

    model_config = ConfigDict(populate_by_name=True)


class TableCreate(TableBase):
    """
    Schema for creating a new table within a batch workflow.
    """

    id: UUID | None = Field(
        default=None,
        description="Custom ID for the table. Auto-generated from name if not provided.",
    )
    workflow_id: UUID | None = Field(
        default=None,
        description="UUID of the parent workflow (set when adding to a workflow)",
    )
    order: int = Field(default=0, ge=0, description="Execution order within the workflow")


class TableUpdate(BaseModel):
    """
    Schema for updating an existing table.
    """

    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    upsert_constraints: list[str] | None = Field(
        default=None,
        alias="upsert_constrains",
        min_length=1,
    )
    time_column: str | None = Field(default=None)
    time_compression: bool | None = Field(default=None)
    sync_schema: bool | None = Field(default=None)
    function: FunctionDefinition | None = Field(default=None)
    order: int | None = Field(default=None, ge=0)


class Table(TableBase, TimestampMixin):
    """
    Complete Table model as returned from the API.
    """

    id: UUID = Field(..., description="Table identifier")
    workflow_id: UUID = Field(..., description="UUID of the parent workflow")
    order: int = Field(default=0, ge=0, description="Execution order within the workflow")
    last_computed: datetime | None = Field(default=None, description="Last computation timestamp")
    row_count: int = Field(default=0, ge=0, description="Number of rows in the table")


class WorkflowBase(APIBaseModel):
    """
    Base fields for a batch Workflow.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Workflow name identifier",
        examples=["oee_workflow", "production_metrics"],
    )
    type: WorkflowType = Field(
        default=WorkflowType.BATCH,
        description="Workflow type (always 'batch' for this model)",
    )
    window: WindowConfig = Field(..., description="Window configuration for the workflow")
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Description of what this workflow computes",
    )
    is_enabled: bool = Field(default=True, description="Whether the workflow is enabled")


class WorkflowCreate(WorkflowBase):
    """
    Schema for creating a new batch workflow with its tables.
    """

    type: Literal[WorkflowType.BATCH] = Field(
        default=WorkflowType.BATCH,
        description="Workflow type (always 'batch')",
    )
    id: UUID | None = Field(
        default=None,
        description="Custom ID for the workflow. Auto-generated from name if not provided.",
    )


class WorkflowUpdate(BaseModel):
    """
    Schema for updating an existing batch workflow.
    """

    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    window: WindowConfig | None = Field(default=None)
    description: str | None = Field(default=None)
    is_enabled: bool | None = Field(default=None)


class Workflow(WorkflowBase, TimestampMixin):
    """
    Complete batch Workflow model as returned from the API.
    """

    id: str = Field(..., description="Workflow identifier")
    organization_id: str = Field(..., description="UUID of the organization")
    tables: list[Table] = Field(default_factory=list, description="Tables computed by this workflow")
    tables_count: int = Field(default=0, ge=0, description="Number of tables in this workflow")
    last_executed: datetime | None = Field(default=None, description="Last time the workflow was executed")
    executions_last_24h: int = Field(default=0, ge=0, description="Number of executions in last 24 hours")


class WorkflowList(BaseModel):
    """
    Response model for listing workflows (batch or streaming).
    """

    items: list[Workflow | StreamingWorkflow] = Field(description="List of workflows")
    total: int = Field(ge=0, description="Total number of workflows")
    organization_id: str = Field(description="Organization ID")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")


class TableList(BaseModel):
    """
    Response model for listing tables.
    """

    items: list[Table] = Field(description="List of tables")
    total: int = Field(ge=0, description="Total number of tables")
    workflow_id: UUID = Field(description="UUID of parent workflow")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    has_next: bool = Field(description="Whether there are more pages")


# Union types for router endpoints
AnyWorkflowCreate = Annotated[
    StreamingWorkflowCreate | WorkflowCreate,
    Field(discriminator="type"),
]

AnyWorkflow = StreamingWorkflow | Workflow
