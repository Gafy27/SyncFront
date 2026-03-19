"""
Bridge routes at Organization level.

A Bridge is a configured connection instance (MQTT broker, OPC-UA server,
InfluxDB endpoint, etc.) scoped to an organization.
Machines reference bridges by name via their `bridges: list[str]` field.

Routes:
- /api/organizations/{org_id}/bridges
"""

from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Path, Query
from managers.config import db


from models.config.api.bridge import Bridge, BridgeCreate, BridgeList, BridgeUpdate

router = APIRouter()


@router.get("", response_model=BridgeList)
async def list_bridges(
    organization_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List all bridges for an organization."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    offset = (page - 1) * page_size
    items, total = await db.list(
        "bridges",
        filter_key="organization_id",
        filter_value=org_id_str,
        limit=page_size,
        offset=offset,
        org_id=org_id_str,
    )

    return BridgeList(
        items=[Bridge.model_validate(item) for item in items],
        total=total,
        organization_id=organization_id,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.post("", status_code=201, response_model=Bridge)
async def create_bridge(organization_id: UUID, request: BridgeCreate):
    """Create a new bridge."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Enforce unique name within organization
    existing, _ = await db.list(
        "bridges",
        filter_key="name",
        filter_value=request.name,
        limit=1,
        org_id=org_id_str,
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Bridge named '{request.name}' already exists in this organization")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    data["organization_id"] = org_id_str
    bridge_id = str(uuid4())

    result = await db.create("bridges", bridge_id, data, org_id=org_id_str)
    return Bridge.model_validate(result)


@router.get("/{bridge_id}", response_model=Bridge)
async def get_bridge(
    organization_id: UUID,
    bridge_id: UUID = Path(..., description="The bridge UUID"),
):
    """Get a bridge by ID."""
    org_id_str = str(organization_id)
    item = await db.get("bridges", str(bridge_id), org_id=org_id_str)
    if not item or item.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Bridge not found")
    return Bridge.model_validate(item)


@router.put("/{bridge_id}", response_model=Bridge)
async def update_bridge(
    organization_id: UUID,
    bridge_id: UUID = Path(..., description="The bridge UUID"),
    request: BridgeUpdate = ...,
):
    """Update a bridge."""
    org_id_str = str(organization_id)
    bridge_id_str = str(bridge_id)
    existing = await db.get("bridges", bridge_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Bridge not found")

    # Check name uniqueness if renaming
    if request.name and request.name != existing.get("name"):
        conflict, _ = await db.list(
            "bridges",
            filter_key="name",
            filter_value=request.name,
            limit=1,
            org_id=org_id_str,
        )
        if conflict:
            raise HTTPException(status_code=409, detail=f"Bridge named '{request.name}' already exists in this organization")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("bridges", bridge_id_str, data, org_id=org_id_str)
    return Bridge.model_validate(result)


@router.delete("/{bridge_id}", status_code=204)
async def delete_bridge(
    organization_id: UUID,
    bridge_id: UUID = Path(..., description="The bridge UUID"),
):
    """Delete a bridge."""
    org_id_str = str(organization_id)
    bridge_id_str = str(bridge_id)
    existing = await db.get("bridges", bridge_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Bridge not found")
    await db.delete("bridges", bridge_id_str, org_id=org_id_str)
