"""
Connector template routes (global, not org-scoped).

Routes:
- GET    /api/connector-templates          - List all templates
- GET    /api/connector-templates/{id}     - Get template by ID
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from managers.config import db


router = APIRouter()


@router.get("")
async def list_connector_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List all connector templates."""
    offset = (page - 1) * page_size
    items, _ = await db.list("connector_templates", limit=page_size, offset=offset)
    return items


@router.get("/{template_id}")
async def get_connector_template(template_id: UUID):
    """Get a connector template by ID."""
    item = await db.get("connector_templates", str(template_id))
    if not item:
        raise HTTPException(status_code=404, detail="Connector template not found")
    return item
