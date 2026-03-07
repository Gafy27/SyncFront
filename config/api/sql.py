from uuid import UUID

from pydantic import BaseModel, Field


class SQLRequest(BaseModel):
    query: str = Field(..., description="Raw SQL query to execute")
    org_id: UUID | None = Field(default=None, description="Organization UUID for context (optional)")
