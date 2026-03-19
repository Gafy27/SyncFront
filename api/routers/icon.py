from uuid import UUID

from fastapi import APIRouter, HTTPException

from managers.config import db

router = APIRouter()


@router.get("/connector-templates/{template_id}")
async def get_connector_template_icon(template_id: UUID):
    """
    Return the icon for a connector template.
    Uses the 'icon' field on the connector_templates row.
    """
    template_id_str = str(template_id)
    existing = await db.get("connector_templates", template_id_str)
    if not existing:
        raise HTTPException(status_code=404, detail="Connector template not found")
    icon = existing.get("icon")
    if not icon:
        raise HTTPException(status_code=404, detail="Connector template has no icon")
    return icon