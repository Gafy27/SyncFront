"""
Organization routes with nested resources.

Routes:
- /api/organizations
- /api/organizations/{organization_id}
- /api/organizations/{organization_id}/users
- /api/organizations/{organization_id}/machines
- /api/organizations/{organization_id}/events
"""

from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query
from managers.config import db

from api.auth import hash_password
from models.config.api import (
    Event,
    EventCreate,
    EventUpdate,
    Machine,
    MachineCreate,
    MachineList,
    MachineUpdate,
    Organization,
    OrganizationCreate,
    OrganizationUpdate,
    User,
    UserCreate,
    UserUpdate,
)

router = APIRouter()


# =============================================================================
# ORGANIZATIONS
# =============================================================================

@router.get("", response_model=list[Organization])
async def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List all organizations."""
    offset = (page - 1) * page_size
    items, _ = await db.list("organizations", limit=page_size, offset=offset)
    return [Organization.model_validate(item) for item in items]


@router.post("", status_code=201, response_model=Organization)
async def create_organization(request: OrganizationCreate):
    """Create a new organization."""
    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    org_id = str(uuid4())

    existing = await db.get("organizations", org_id)
    if existing:
        raise HTTPException(status_code=409, detail="Organization already exists")

    result = await db.create("organizations", org_id, data)
    await db.init_tenant_tables(org_id)
    return Organization.model_validate(result)


@router.get("/{organization_id}", response_model=Organization)
async def get_organization(organization_id: UUID):
    """Get organization by ID."""
    item = await db.get("organizations", str(organization_id))
    if not item:
        raise HTTPException(status_code=404, detail="Organization not found")
    return Organization.model_validate(item)


@router.put("/{organization_id}", response_model=Organization)
async def update_organization(organization_id: UUID, request: OrganizationUpdate):
    """Update an organization."""
    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("organizations", str(organization_id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return Organization.model_validate(result)


@router.delete("/{organization_id}", status_code=204)
async def delete_organization(organization_id: UUID):
    """Delete an organization."""
    deleted = await db.delete("organizations", str(organization_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Organization not found")


@router.get("/{organization_id}/stats")
async def get_organization_stats(organization_id: UUID):
    """Get organization statistics."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    _, user_count = await db.list("users", filter_key="organization_id", filter_value=org_id_str, org_id=org_id_str)
    _, machine_count = await db.list("machines", filter_key="organization_id", filter_value=org_id_str, org_id=org_id_str)
    _, event_count = await db.list("events", filter_key="organization_id", filter_value=org_id_str, org_id=org_id_str)

    return {
        "organization_id": organization_id,
        "organization_name": org.get("name"),
        "user_count": user_count,
        "machine_count": machine_count,
        "event_count": event_count,
    }


# =============================================================================
# USERS (under organization)
# =============================================================================

@router.get("/{organization_id}/users", response_model=list[User])
async def list_users(
    organization_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List users for an organization."""
    org_id_str = str(organization_id)
    offset = (page - 1) * page_size
    items, _ = await db.list(
        "users",
        filter_key="organization_id",
        filter_value=org_id_str,
        limit=page_size,
        offset=offset,
    )
    return [User.model_validate(item) for item in items]


@router.post("/{organization_id}/users", status_code=201, response_model=User)
async def create_user(organization_id: UUID, request: UserCreate):
    """Create a new user in the organization."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    data["organization_id"] = org_id_str
    user_id = str(uuid4())

    existing_users, _ = await db.list("users", filter_key="email", filter_value=data.get("email"))
    if existing_users:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Hash password before storing — never store plaintext
    plain_password = data.pop("password", None)
    if plain_password:
        data["password_hash"] = hash_password(plain_password)

    result = await db.create("users", user_id, data)
    return User.model_validate(result)


@router.get("/{organization_id}/users/{user_id}", response_model=User)
async def get_user(organization_id: UUID, user_id: UUID):
    """Get a user by ID."""
    org_id_str = str(organization_id)
    item = await db.get("users", str(user_id))
    if not item or item.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="User not found")
    return User.model_validate(item)


@router.put("/{organization_id}/users/{user_id}", response_model=User)
async def update_user(organization_id: UUID, user_id: UUID, request: UserUpdate):
    """Update a user."""
    org_id_str = str(organization_id)
    user_id_str = str(user_id)
    existing = await db.get("users", user_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="User not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("users", user_id_str, data)
    return User.model_validate(result)


@router.delete("/{organization_id}/users/{user_id}", status_code=204)
async def delete_user(organization_id: UUID, user_id: UUID):
    """Delete a user."""
    org_id_str = str(organization_id)
    user_id_str = str(user_id)
    existing = await db.get("users", user_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete("users", user_id_str)


# =============================================================================
# MACHINES (under organization)
# =============================================================================

@router.get("/{organization_id}/machines", response_model=MachineList)
async def list_machines(
    organization_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List machines for an organization."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    offset = (page - 1) * page_size
    items, total = await db.list(
        "machines",
        filter_key="organization_id",
        filter_value=org_id_str,
        limit=page_size,
        offset=offset,
        org_id=org_id_str,
    )
    return MachineList(
        items=[Machine.model_validate(item) for item in items],
        total=total,
        organization_id=organization_id,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.post("/{organization_id}/machines", status_code=201, response_model=Machine)
async def create_machine(organization_id: UUID, request: MachineCreate):
    """Create a new machine."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    data["organization_id"] = org_id_str
    machine_db_id = str(uuid4())

    result = await db.create("machines", machine_db_id, data, org_id=org_id_str)
    return Machine.model_validate(result)


@router.get("/{organization_id}/machines/{machine_id}", response_model=Machine)
async def get_machine(organization_id: UUID, machine_id: UUID):
    """Get a machine by ID."""
    org_id_str = str(organization_id)
    item = await db.get("machines", str(machine_id), org_id=org_id_str)
    if not item or item.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Machine not found")
    return Machine.model_validate(item)


@router.put("/{organization_id}/machines/{machine_id}", response_model=Machine)
async def update_machine(organization_id: UUID, machine_id: UUID, request: MachineUpdate):
    """Update a machine."""
    org_id_str = str(organization_id)
    machine_id_str = str(machine_id)
    existing = await db.get("machines", machine_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Machine not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("machines", machine_id_str, data, org_id=org_id_str)
    return Machine.model_validate(result)


@router.delete("/{organization_id}/machines/{machine_id}", status_code=204)
async def delete_machine(organization_id: UUID, machine_id: UUID):
    """Delete a machine."""
    org_id_str = str(organization_id)
    machine_id_str = str(machine_id)
    existing = await db.get("machines", machine_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Machine not found")
    await db.delete("machines", machine_id_str, org_id=org_id_str)


# =============================================================================
# EVENTS (under organization, formerly event-classes)
# =============================================================================

@router.get("/{organization_id}/events", response_model=list[Event])
async def list_events(
    organization_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List events for an organization."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    offset = (page - 1) * page_size
    items, _ = await db.list(
        "events",
        filter_key="organization_id",
        filter_value=org_id_str,
        limit=page_size,
        offset=offset,
        org_id=org_id_str,
    )
    return [Event.model_validate(item) for item in items]


@router.post("/{organization_id}/events", status_code=201, response_model=Event)
async def create_event(organization_id: UUID, request: EventCreate):
    """Create a new event."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    data["organization_id"] = org_id_str
    event_id = str(uuid4())

    result = await db.create("events", event_id, data, org_id=org_id_str)
    return Event.model_validate(result)


@router.put("/{organization_id}/events", response_model=list[Event])
async def replace_events(organization_id: UUID, request: list[EventCreate]):
    """Replace all events for an organization."""
    org_id_str = str(organization_id)
    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing, _ = await db.list("events", filter_key="organization_id", filter_value=org_id_str, limit=1000, org_id=org_id_str)
    for item in existing:
        await db.delete("events", item["id"], org_id=org_id_str)

    results = []
    for ev in request:
        data = ev.model_dump(mode="json", exclude_none=True, by_alias=True)
        data["organization_id"] = org_id_str
        event_id = str(uuid4())
        result = await db.create("events", event_id, data, org_id=org_id_str)
        results.append(Event.model_validate(result))

    return results


@router.get("/{organization_id}/events/{event_id}", response_model=Event)
async def get_event(organization_id: UUID, event_id: UUID):
    """Get an event by ID."""
    org_id_str = str(organization_id)
    item = await db.get("events", str(event_id), org_id=org_id_str)
    if not item or item.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Event not found")
    return Event.model_validate(item)


@router.put("/{organization_id}/events/{event_id}", response_model=Event)
async def update_event(organization_id: UUID, event_id: UUID, request: EventUpdate):
    """Update an event."""
    org_id_str = str(organization_id)
    ev_id_str = str(event_id)
    existing = await db.get("events", ev_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Event not found")

    data = request.model_dump(mode="json", exclude_none=True, by_alias=True)
    result = await db.update("events", ev_id_str, data, org_id=org_id_str)
    return Event.model_validate(result)


@router.delete("/{organization_id}/events/{event_id}", status_code=204)
async def delete_event(organization_id: UUID, event_id: UUID):
    """Delete an event."""
    org_id_str = str(organization_id)
    ev_id_str = str(event_id)
    existing = await db.get("events", ev_id_str, org_id=org_id_str)
    if not existing or existing.get("organization_id") != org_id_str:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete("events", ev_id_str, org_id=org_id_str)
