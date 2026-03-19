from typing import Any

from fastapi import APIRouter, HTTPException

from managers.config import db
from managers.sql import execute_on_bridge, list_sql_bridges
from models.config.api.sql import SQLRequest

router = APIRouter()


@router.get("/bridges")
async def get_sql_bridges():
    """List all SQL-capable bridges available in bridge.yml."""
    return list_sql_bridges()


async def _execute_on_org_bridge(org_id: str, bridge_id: str, query: str) -> list[dict[str, Any]]:
    """Look up an org-scoped bridge by ID and execute a SQL query against its configured database."""
    bridge = await db.get("bridges", bridge_id, org_id=org_id)
    if not bridge or bridge.get("organization_id") != org_id:
        raise ValueError(f"Bridge '{bridge_id}' not found in organization '{org_id}'")

    config: dict[str, Any] = bridge.get("config") or {}
    host = config.get("host", "localhost")
    port = config.get("port", 5432)
    database = config.get("database") or config.get("db") or config.get("dbname")
    user = config.get("user") or config.get("username")
    password = config.get("password")

    if not database or not user:
        raise ValueError(
            f"Bridge '{bridge.get('name')}' is missing required config fields (database, user)"
        )

    dsn = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    return await execute_on_bridge(dsn, query)


@router.post("/execute", response_model=list[dict[str, Any]])
async def execute_sql(request: SQLRequest):
    """
    Execute a raw SQL query and return results as JSON.

    Bridge selection priority:
    1. `bridge_id` + `org_id` — org-scoped bridge looked up from the database.
    2. Neither                — executes against the API database (public schema).
    """
    try:
        if request.bridge_id and request.org_id:
            return await _execute_on_org_bridge(
                str(request.org_id), str(request.bridge_id), request.query
            )

        return await db.execute(request.query)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")
