"""
Metadata routes — user-defined tables stored in the organization's 'metadata' PG table.

Routes:
  GET    /                              list metadata tables
  POST   /                              create a metadata table
  DELETE /{table_name}                  drop all records for a logical table

  GET    /{table_name}/records          list records
  POST   /{table_name}/records          create a record
  GET    /{table_name}/records/{id}     get a record
  PUT    /{table_name}/records/{id}     replace a record
  PATCH  /{table_name}/records/{id}     partial update
  DELETE /{table_name}/records/{id}     delete a record
"""

from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query

from managers.config import db
from models.config.api.metadata import (
    MetadataRecord,
    MetadataRecordCreate,
    MetadataRecordList,
    MetadataRecordUpdate,
    MetadataTable,
    MetadataTableCreate,
    MetadataTableList,
)

router = APIRouter()


async def _require_org(org_id: str) -> None:
    if not await db.get("organizations", org_id):
        raise HTTPException(status_code=404, detail="Organization not found")



# =============================================================================
# METADATA TABLES
# =============================================================================


@router.get("", response_model=MetadataTableList)
async def list_metadata_tables(organization_id: UUID):
    """List all user-defined metadata tables."""
    org_id = str(organization_id)
    await _require_org(org_id)
    tables = await db.list_metadata_tables(org_id)
    return MetadataTableList(items=[MetadataTable(**t) for t in tables], total=len(tables))


@router.post("", response_model=MetadataTable, status_code=201)
async def create_metadata_table(organization_id: UUID, body: MetadataTableCreate):
    """Create a metadata table."""
    org_id = str(organization_id)
    await _require_org(org_id)

    sentinel_id = f"__meta__{body.name}"
    existing = await db.get_metadata_record(org_id, body.name, sentinel_id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Metadata table '{body.name}' already exists")


    sentinel_data: dict = {"__sentinel__": True}
    if body.description:
        sentinel_data["description"] = body.description
    await db.create_metadata_record(org_id, body.name, sentinel_id, sentinel_data)
    return MetadataTable(name=body.name, description=body.description, record_count=0)

@router.delete("/{table_name}", status_code=204)
async def delete_metadata_table(organization_id: UUID, table_name: str):
    """Delete a metadata table and all its records."""
    org_id = str(organization_id)
    await _require_org(org_id)
    deleted = await db.delete_metadata_table(org_id, table_name)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"Metadata table '{table_name}' not found")


# =============================================================================
# RECORDS
# =============================================================================


@router.get("/{table_name}/records", response_model=MetadataRecordList)
async def list_metadata_records(
    organization_id: UUID,
    table_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    org_id = str(organization_id)
    await _require_org(org_id)
    offset = (page - 1) * page_size
    records, total = await db.list_metadata_records(org_id, table_name, limit=page_size, offset=offset)
    visible = [r for r in records if not r["data"].get("__sentinel__")]
    return MetadataRecordList(
        items=[MetadataRecord(**r) for r in visible],
        total=max(0, total - 1),
        table_name=table_name,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.post("/{table_name}/records", response_model=MetadataRecord, status_code=201)
async def create_metadata_record(organization_id: UUID, table_name: str, body: MetadataRecordCreate):
    org_id = str(organization_id)
    await _require_org(org_id)
    record_id = str(uuid4())
    result = await db.create_metadata_record(org_id, table_name, record_id, body.data)
    return MetadataRecord(**result)


@router.post("/{table_name}/records/bulk", status_code=201)
async def bulk_create_metadata_records(organization_id: UUID, table_name: str, body: list[MetadataRecordCreate]):
    org_id = str(organization_id)
    await _require_org(org_id)
    
    # We'll do this in a loop for now, but in a real app we'd batch it in SQL
    results = []
    for item in body:
        record_id = str(uuid4())
        res = await db.create_metadata_record(org_id, table_name, record_id, item.data)
        results.append(res)
    
    return {"count": len(results), "table_name": table_name}


@router.get("/{table_name}/records/{record_id}", response_model=MetadataRecord)
async def get_metadata_record(organization_id: UUID, table_name: str, record_id: str):
    org_id = str(organization_id)
    await _require_org(org_id)
    record = await db.get_metadata_record(org_id, table_name, record_id)
    if record is None or record["data"].get("__sentinel__"):
        raise HTTPException(status_code=404, detail="Record not found")
    return MetadataRecord(**record)


@router.put("/{table_name}/records/{record_id}", response_model=MetadataRecord)
async def replace_metadata_record(
    organization_id: UUID, table_name: str, record_id: str, body: MetadataRecordCreate
):
    org_id = str(organization_id)
    await _require_org(org_id)
    result = await db.replace_metadata_record(org_id, table_name, record_id, body.data)
    return MetadataRecord(**result)


@router.patch("/{table_name}/records/{record_id}", response_model=MetadataRecord)
async def update_metadata_record(
    organization_id: UUID, table_name: str, record_id: str, body: MetadataRecordUpdate
):
    org_id = str(organization_id)
    await _require_org(org_id)
    result = await db.update_metadata_record(org_id, table_name, record_id, body.data)
    if result is None or result["data"].get("__sentinel__"):
        raise HTTPException(status_code=404, detail="Record not found")
    return MetadataRecord(**result)


@router.delete("/{table_name}/records/{record_id}", status_code=204)
async def delete_metadata_record(organization_id: UUID, table_name: str, record_id: str):
    org_id = str(organization_id)
    await _require_org(org_id)
    deleted = await db.delete_metadata_record(org_id, table_name, record_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found")
