from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class WindowType(str, Enum):
    TUMBLING = "tumbling"
    SLIDING = "sliding"
    STEPPING = "stepping"
    SESSION = "session"


class WindowConfig(BaseModel):
    type: WindowType = Field(description="Window type")
    size: str | None = Field(default=None, description="Window size for tumbling/sliding (e.g., '1m', '5m', '1h')")
    step: str | None = Field(default=None, description="Step size for sliding windows")
    triggers: list[str] | None = Field(default=None, description="Triggers for stepping windows")

    @model_validator(mode="after")
    def validate_window_fields(self):
        if self.type == WindowType.TUMBLING and not self.size:
            raise ValueError("Tumbling window requires 'size' field")
        if self.type == WindowType.SLIDING and (not self.size or not self.step):
            raise ValueError("Sliding window requires 'size' and 'step' fields")
        if self.type == WindowType.STEPPING and not self.triggers:
            raise ValueError("Stepping window requires 'triggers' field")
        return self


class FunctionType(str, Enum):
    SQL = "sql"
    PYTHON = "python"


class FunctionConfig(BaseModel):
    type: FunctionType = Field(description="Function type (sql or python)")
    definition: str = Field(description="SQL query or Python code")


# ---------------------------------------------------------------------------
# Streaming sub-models (formerly Rule / Pipeline)
# ---------------------------------------------------------------------------

class StreamingTable(BaseModel):
    type: FunctionType = Field(default=FunctionType.SQL, description="Table computation type (sql or python)")
    definition: str = Field(default="", description="SQL query or Python code")
    publish: bool = Field(default=True, description="Whether to publish the result")
    memory: bool = Field(default=False, description="Whether to store in memory")


class StreamingWorkflow(BaseModel):
    triggers: list[str] = Field(description="Event IDs that trigger this workflow")
    tables: list[StreamingTable] = Field(default_factory=list, description="Tables to execute in order")

    @model_validator(mode="after")
    def validate_tables(self) -> "StreamingWorkflow":
        if not self.tables:
            raise ValueError("StreamingWorkflow must have at least one table")
        return self


# ---------------------------------------------------------------------------
# Batch sub-models (formerly WorkflowConfig / TableConfig in computer_config)
# ---------------------------------------------------------------------------

class BatchTable(BaseModel):
    name: str = Field(description="Table name")
    upsert_constrains: list[str] = Field(description="Columns for UNIQUE constraint used in upsert")
    time_column: str | None = Field(default=None, description="Time column name; when set, table is created as a hypertable")
    time_compression: bool | None = Field(default=None, description="If True, compress time column")
    sync_schema: bool | None = Field(default=None, description="If True, sync schema before write")
    function: FunctionConfig = Field(description="Function configuration")


class BatchWorkflow(BaseModel):
    task_queue: str = Field(description="Task queue name")
    window: WindowConfig | None = None
    tables: list[BatchTable] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Unified WorkflowConfig
# ---------------------------------------------------------------------------

class WorkflowConfig(BaseModel):
    streaming: dict[str, StreamingWorkflow] = Field(default_factory=dict)
    batch: dict[str, BatchWorkflow] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def transform_workflows(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            raise ValueError(f"Invalid workflow config, input data type is not a dictionary: {type(data)}")
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WorkflowConfig":
        """
        Parse unified workflow config with 'streaming' and 'batch' sub-keys.

        Also handles legacy formats:
        - Old rules config: {"pipelines": {...}} → streaming
        - Old computer config: {"workflows": {...}} → batch
        """
        if not isinstance(data, dict):
            return cls()

        transformed: dict[str, Any] = {}

        # New unified format
        if "streaming" in data or "batch" in data:
            transformed["streaming"] = data.get("streaming", {})
            transformed["batch"] = data.get("batch", {})
            return cls.model_validate(transformed)


        # Legacy computer format: {"workflows": {name: {task_queue, window, tables}}}
        if "workflows" in data:
            transformed["streaming"] = {}
            transformed["batch"] = data["workflows"]
            return cls.model_validate(transformed)

        return cls()
