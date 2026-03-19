"""
Authentication routes for SyncCore API.

Handles user login (OAuth2 form data) and returns JWT token + org memberships.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from managers.config import db

from api.auth import get_current_user
from api.auth import create_access_token, verify_password
from models.config.api.user import (
    OrganizationMembership,
    TokenResponse,
    UserRole,
    UserStatus,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate user with email/password and return a JWT access token.

    Uses OAuth2 password flow — `username` field is the user's email address.
    """
    email = form.username

    users, _ = await db.list("users", filter_key="email", filter_value=email, limit=1)
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = users[0]
    user_id = str(user.get("id"))
    password_hash = user.get("password_hash")

    if not password_hash or not verify_password(form.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.update("users", user_id, {"last_login": datetime.now(timezone.utc).isoformat()})

    token = create_access_token({"sub": user_id})
    return TokenResponse(access_token=token)


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """
    Get the currently authenticated user with all organization memberships.
    """
    user_id_str = str(user.get("id"))

    memberships, _ = await db.list(
        "user_organizations",
        filter_key="user_id",
        filter_value=user_id_str,
        limit=100,
    )

    organizations = []
    for membership in memberships:
        org_id = membership.get("organization_id")
        org = await db.get("organizations", org_id)
        if org:
            organizations.append(
                OrganizationMembership(
                    organization_id=org_id,
                    organization_name=org.get("name"),
                    organization_slug=org.get("slug"),
                    role=UserRole(membership.get("role", "viewer")),
                    status=UserStatus(membership.get("status", "active")),
                    joined_at=membership.get("created_at"),
                )
            )

    user["organizations"] = [org.model_dump() for org in organizations]
    return user


@router.post("/organizations/{organization_id}/members", status_code=201)
async def add_user_to_organization(
    organization_id: UUID,
    user_id: UUID,
    role: UserRole = UserRole.VIEWER,
    _: dict = Depends(get_current_user),
):
    """Add a user to an organization."""
    org_id_str = str(organization_id)
    user_id_str = str(user_id)

    org = await db.get("organizations", org_id_str)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    user = await db.get("users", user_id_str)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing, _ = await db.list(
        "user_organizations",
        filter_key="user_id",
        filter_value=user_id_str,
        limit=100,
    )
    for membership in existing:
        if membership.get("organization_id") == org_id_str:
            raise HTTPException(status_code=400, detail="User is already a member of this organization")

    membership_id = f"{user_id_str}_{org_id_str}"
    membership_data = {
        "user_id": user_id_str,
        "organization_id": org_id_str,
        "role": role.value,
        "status": "active",
    }

    return await db.create("user_organizations", membership_id, membership_data)


@router.delete("/organizations/{organization_id}/members/{user_id}", status_code=204)
async def remove_user_from_organization(
    organization_id: UUID,
    user_id: UUID,
    _: dict = Depends(get_current_user),
):
    """Remove a user from an organization."""
    org_id_str = str(organization_id)
    user_id_str = str(user_id)

    memberships, _ = await db.list(
        "user_organizations",
        filter_key="user_id",
        filter_value=user_id_str,
        limit=100,
    )

    membership_id = None
    for membership in memberships:
        if membership.get("organization_id") == org_id_str:
            membership_id = membership.get("id")
            break

    if not membership_id:
        raise HTTPException(status_code=404, detail="Membership not found")

    await db.delete("user_organizations", membership_id)


@router.put("/organizations/{organization_id}/members/{user_id}/role")
async def update_user_role(
    organization_id: UUID,
    user_id: UUID,
    role: UserRole,
    _: dict = Depends(get_current_user),
):
    """Update a user's role in an organization."""
    org_id_str = str(organization_id)
    user_id_str = str(user_id)

    memberships, _ = await db.list(
        "user_organizations",
        filter_key="user_id",
        filter_value=user_id_str,
        limit=100,
    )

    membership_id = None
    for membership in memberships:
        if membership.get("organization_id") == org_id_str:
            membership_id = membership.get("id")
            break

    if not membership_id:
        raise HTTPException(status_code=404, detail="Membership not found")

    return await db.update("user_organizations", membership_id, {"role": role.value})
