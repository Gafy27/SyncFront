"""
SyncCore Configuration API

Multi-tenant API for managing SyncCore instance configuration.
Follows hierarchical route structure:
- /api/organizations
- /api/organizations/{org_id}/bridges
- /api/organizations/{org_id}/machines
- /api/organizations/{org_id}/events
- /api/organizations/{org_id}/workflows
- /api/services (global)
- /api/connector-templates (global)
"""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from api.auth import get_current_user
from api.routers import agent, auth, bridges, connector_templates, icon, metadata, organizations, sql, workflows
from managers.config import lifespan

app = FastAPI(
    title="SyncCore Configuration API",
    description="API for managing SyncCore instance configuration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://0.0.0.0:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Convert database errors into structured HTTP responses instead of crashing."""
    orig = getattr(exc, "orig", None)
    db_message = str(orig).strip() if orig else str(exc).strip()
    return JSONResponse(
        status_code=400,
        content={
            "detail": db_message,
            "error_type": type(exc).__name__,
        },
    )

_auth_dep = [Depends(get_current_user)]

# Mount routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])  # /login is public
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"], dependencies=_auth_dep)
app.include_router(connector_templates.router, prefix="/api/connector-templates", tags=["connector-templates"], dependencies=_auth_dep)
app.include_router(icon.router, prefix="/api/icons", tags=["icons"], dependencies=_auth_dep)
app.include_router(sql.router, prefix="/api/sql", tags=["sql"], dependencies=_auth_dep)

# Nested routers - organization-scoped resources
app.include_router(
    bridges.router,
    prefix="/api/organizations/{organization_id}/bridges",
    tags=["bridges"],
    dependencies=_auth_dep,
)
app.include_router(
    workflows.router,
    prefix="/api/organizations/{organization_id}/workflows",
    tags=["workflows", "tables"],
    dependencies=_auth_dep,
)
app.include_router(
    metadata.router,
    prefix="/api/organizations/{organization_id}/metadata",
    tags=["metadata"],
    dependencies=_auth_dep,
)
app.include_router(
    agent.router,
    prefix="/api/agent",
    tags=["agent"],
    dependencies=_auth_dep,
)


@app.get("/status")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


import uvicorn

uvicorn.run(app, host="0.0.0.0", port=8001)
