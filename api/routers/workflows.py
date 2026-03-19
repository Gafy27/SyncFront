"""
Workflow routes at Organization level.

All workflows (stream and batch) share the same model, discriminated by the
'type' field. Tables are uniform across both types.

Routes:
- /api/organizations/{org_id}/workflows
- /api/organizations/{org_id}/workflows/{workflow_id}/tables
"""

from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Path, Query

from managers.config import db
from managers.logging import log_manager
from managers.workflow import wf
from models.config.api import (
    Table,
    TableCreate,
    TableList,
    TableUpdate,
    Workflow,
    WorkflowCreate,
    WorkflowList,
    WorkflowType,
    WorkflowUpdate,
)

router = APIRouter()


def _load_tables(items: list[dict]) -> list[Table]:
    items.sort(key=lambda t: t.get("order", 0))
    return [Table.model_validate(t) for t in items]


# =============================================================================
# WORKFLOWS
# =============================================================================


@router.get("", response_model=WorkflowList)
async def list_workflows(
    organization_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    type: WorkflowType | None = Query(None, description="Filter by workflow type"),
):
    """List all workflows for an organization."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    offset = (page - 1) * page_size

    if type is not None:
        items, total = await db.list(
            "workflows",
            filter_key="type",
            filter_value=type.value,
            limit=page_size,
            offset=offset,
            org_id=org_id_str,
        )
    else:
        items, total = await db.list(
            "workflows",
            filter_key="organization_id",
            filter_value=org_id_str,
            limit=page_size,
            offset=offset,
            org_id=org_id_str,
        )

    workflows = []
    for item in items:
        workflow_id = item.get("id")
        if workflow_id:
            tables_items, _ = await db.list(
                "workflow_tables",
                filter_key="workflow_id",
                filter_value=str(workflow_id),
                limit=1000,
                org_id=org_id_str,
            )
            item["tables"] = _load_tables(tables_items)
            item["tables_count"] = len(tables_items)
        else:
            item["tables"] = []
            item["tables_count"] = 0
        workflows.append(Workflow.model_validate(item))

    return WorkflowList(
        items=workflows,
        total=total,
        organization_id=org_id_str,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.post("", status_code=201, response_model=Workflow)
async def create_workflow(
    organization_id: UUID,
    request: WorkflowCreate,
) -> Workflow:
    """Create a new workflow with optional tables."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    data["organization_id"] = org_id_str
    tables_data = data.pop("tables", [])

    workflow_id = str(uuid4())
    result = await db.create("workflows", workflow_id, data, org_id=org_id_str)

    created_tables = []
    for idx, table_data in enumerate(tables_data):
        table_create = TableCreate.model_validate(table_data)
        tdict = table_create.model_dump(mode="json", exclude_none=True, by_alias=True)
        tdict["workflow_id"] = workflow_id
        tdict.setdefault("order", idx)
        table_id = str(uuid4())
        created = await db.create("workflow_tables", table_id, tdict, org_id=org_id_str)
        created_tables.append(Table.model_validate(created))

    created_tables.sort(key=lambda t: t.order)
    result["tables"] = created_tables
    result["tables_count"] = len(created_tables)
    return Workflow.model_validate(result)


@router.get("/{workflow_id}", response_model=Workflow)
async def get_workflow(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
) -> Workflow:
    """Get a workflow by UUID with its tables."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    item = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not item or item.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    tables_items, _ = await db.list(
        "workflow_tables",
        filter_key="workflow_id",
        filter_value=workflow_id_str,
        limit=1000,
        org_id=org_id_str,
    )
    item["tables"] = _load_tables(tables_items)
    item["tables_count"] = len(tables_items)
    return Workflow.model_validate(item)


@router.put("/{workflow_id}", response_model=Workflow)
async def update_workflow(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
    request: WorkflowUpdate = ...,
) -> Workflow:
    """Update a workflow."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    existing = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("workflows", workflow_id_str, data, org_id=org_id_str)

    tables_items, _ = await db.list(
        "workflow_tables",
        filter_key="workflow_id",
        filter_value=workflow_id_str,
        limit=1000,
        org_id=org_id_str,
    )
    result = result or {}
    result["tables"] = _load_tables(tables_items)
    result["tables_count"] = len(tables_items)
    return Workflow.model_validate(result)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
):
    """Delete a workflow and all its tables."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    existing = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    tables_items, _ = await db.list(
        "workflow_tables",
        filter_key="workflow_id",
        filter_value=workflow_id_str,
        limit=1000,
        org_id=org_id_str,
    )
    for table in tables_items:
        await db.delete("workflow_tables", table["id"], org_id=org_id_str)

    await db.delete("workflows", workflow_id_str, org_id=org_id_str)


# =============================================================================
# TABLES (under any workflow)
# =============================================================================


@router.get("/{workflow_id}/tables", response_model=TableList)
async def list_tables(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List all tables for a workflow."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    offset = (page - 1) * page_size
    items, total = await db.list(
        "workflow_tables",
        filter_key="workflow_id",
        filter_value=workflow_id_str,
        limit=page_size,
        offset=offset,
        org_id=org_id_str,
    )

    return TableList(
        items=_load_tables(items),
        total=total,
        workflow_id=workflow_id,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.post("/{workflow_id}/tables", status_code=201, response_model=Table)
async def create_table(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
    request: TableCreate = ...,
):
    """Create a new table in a workflow."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    data["workflow_id"] = workflow_id_str

    if "order" not in data:
        existing_tables, _ = await db.list(
            "workflow_tables",
            filter_key="workflow_id",
            filter_value=workflow_id_str,
            limit=1000,
            org_id=org_id_str,
        )
        data["order"] = len(existing_tables)

    table_id = str(uuid4())
    result = await db.create("workflow_tables", table_id, data, org_id=org_id_str)
    return Table.model_validate(result)


@router.get("/{workflow_id}/tables/{table_id}", response_model=Table)
async def get_table(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow's UUID"),
    table_id: UUID = Path(..., description="The table's UUID"),
):
    """Get a table by ID."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    item = await db.get("workflow_tables", str(table_id), org_id=org_id_str)
    if not item or item.get("workflow_id") != workflow_id_str:
        raise HTTPException(status_code=404, detail="Table not found")

    return Table.model_validate(item)


@router.put("/{workflow_id}/tables/{table_id}", response_model=Table)
async def update_table(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow's UUID"),
    table_id: UUID = Path(..., description="The table UUID"),
    request: TableUpdate = ...,
):
    """Update a table."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    table_id_str = str(table_id)
    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    existing = await db.get("workflow_tables", table_id_str, org_id=org_id_str)
    if not existing or existing.get("workflow_id") != workflow_id_str:
        raise HTTPException(status_code=404, detail="Table not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("workflow_tables", table_id_str, data, org_id=org_id_str)
    return Table.model_validate(result)


@router.delete("/{workflow_id}/tables/{table_id}", status_code=204)
async def delete_table(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
    table_id: UUID = Path(..., description="The table UUID"),
):
    """Delete a table."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)
    table_id_str = str(table_id)
    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    existing = await db.get("workflow_tables", table_id_str, org_id=org_id_str)
    if not existing or existing.get("workflow_id") != workflow_id_str:
        raise HTTPException(status_code=404, detail="Table not found")

    await db.delete("workflow_tables", table_id_str, org_id=org_id_str)


# =============================================================================
# WORKFLOW LOGS
# =============================================================================


@router.get("/{workflow_id}/runs")
async def list_workflow_runs(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List all runs for a workflow, most recent first."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)

    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    offset = (page - 1) * page_size
    items, total = await log_manager.list_runs(workflow_id_str, limit=page_size, offset=offset)

    return {
        "workflow_id": workflow_id_str,
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (offset + page_size) < total,
    }


@router.get("/{workflow_id}/runs/{run_id}")
async def list_run_activities(
    organization_id: UUID,
    workflow_id: UUID = Path(..., description="The workflow UUID"),
    run_id: str = Path(..., description="The Temporal run ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
):
    """List all activity log entries for a specific run."""
    org_id_str = str(organization_id)
    workflow_id_str = str(workflow_id)

    workflow = await db.get("workflows", workflow_id_str, org_id=org_id_str)
    if not workflow or workflow.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Workflow not found")

    offset = (page - 1) * page_size
    items, total = await log_manager.list_activities(run_id, limit=page_size, offset=offset)

    return {
        "workflow_id": workflow_id_str,
        "run_id": run_id,
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (offset + page_size) < total,
    }


# =============================================================================
# LIFECYCLE SIGNALS
# =============================================================================


@router.post("/{workflow_id}/start", status_code=204)
async def start_workflow(workflow_id: UUID = Path(..., description="The workflow UUID")):
    """Start a workflow."""
    await wf.produce(workflow_id, "start")


@router.post("/{workflow_id}/stop", status_code=204)
async def stop_workflow(workflow_id: UUID = Path(..., description="The workflow UUID")):
    """Stop a workflow."""
    await wf.produce(workflow_id, "stop")


@router.post("/{workflow_id}/restart", status_code=204)
async def restart_workflow(workflow_id: UUID = Path(..., description="The workflow UUID")):
    """Restart a workflow."""
    await wf.produce(workflow_id, "restart")


@router.post("/{workflow_id}/reset", status_code=204)
async def reset_workflow(workflow_id: UUID = Path(..., description="The workflow UUID")):
    """Reset a workflow."""
    await wf.produce(workflow_id, "reset")


@router.post("/{workflow_id}/terminate", status_code=204)
async def terminate_workflow(workflow_id: UUID = Path(..., description="The workflow UUID")):
    """Terminate a workflow."""
    await wf.produce(workflow_id, "terminate")
