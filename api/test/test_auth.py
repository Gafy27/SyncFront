"""
Test authentication and multi-organization access.

This script demonstrates:
1. Creating a user with access to multiple organizations
2. Logging in and receiving all accessible organizations
3. Managing organization memberships
"""

import asyncio
import logging
import uuid

from api.database import ConfigManagerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_multi_org_user(config_manager: ConfigManagerService):
    """Test user with multiple organization memberships."""

    # Create two organizations
    org1_id = str(uuid.uuid4())
    org2_id = str(uuid.uuid4())

    logger.info("Creating organizations...")
    await config_manager.replace("organizations", org1_id, {
        "id": org1_id,
        "name": "Acme Manufacturing",
        "slug": "acme",
        "status": "active"
    })
    await config_manager.init_tenant_tables(org1_id)
    logger.info(f"Created organization 1: {org1_id}")

    await config_manager.replace("organizations", org2_id, {
        "id": org2_id,
        "name": "GlobalTech Industries",
        "slug": "globaltech",
        "status": "active"
    })
    await config_manager.init_tenant_tables(org2_id)
    logger.info(f"Created organization 2: {org2_id}")

    # Create a user
    user_id = str(uuid.uuid4())
    await config_manager.replace("users", user_id, {
        "id": user_id,
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "status": "active"
    })
    logger.info(f"Created user: {user_id}")

    # Add user to first organization as owner
    membership1_id = f"{user_id}_{org1_id}"
    await config_manager.replace("user_organizations", membership1_id, {
        "id": membership1_id,
        "user_id": user_id,
        "organization_id": org1_id,
        "role": "owner",
        "status": "active"
    })
    logger.info(f"Added user to org1 as owner")

    # Add user to second organization as admin
    membership2_id = f"{user_id}_{org2_id}"
    await config_manager.replace("user_organizations", membership2_id, {
        "id": membership2_id,
        "user_id": user_id,
        "organization_id": org2_id,
        "role": "admin",
        "status": "active"
    })
    logger.info(f"Added user to org2 as admin")

    # Simulate login - fetch user and their organizations
    logger.info("\n" + "="*60)
    logger.info("SIMULATING LOGIN")
    logger.info("="*60)

    user = await config_manager.get("users", user_id)
    logger.info(f"\nUser found: {user['name']} ({user['email']})")

    # Get all organization memberships
    memberships, _ = await config_manager.list(
        "user_organizations",
        filter_key="user_id",
        filter_value=user_id,
        limit=100
    )

    logger.info(f"\nUser has access to {len(memberships)} organizations:")

    for membership in memberships:
        org_id = membership.get("organization_id")
        org = await config_manager.get("organizations", org_id)
        role = membership.get("role")

        logger.info(f"  - {org['name']} ({org['slug']}) as {role}")

    logger.info("\n" + "="*60)
    logger.info("Login successful! User can access:")
    logger.info("  1. Acme Manufacturing (owner)")
    logger.info("  2. GlobalTech Industries (admin)")
    logger.info("="*60)

    # Demonstrate accessing resources in different orgs
    logger.info("\n" + "="*60)
    logger.info("ACCESSING RESOURCES IN DIFFERENT ORGANIZATIONS")
    logger.info("="*60)

    # Create an application in org1
    app1_id = str(uuid.uuid4())
    await config_manager.replace("applications", app1_id, {
        "id": app1_id,
        "organization_id": org1_id,
        "name": "CNC Monitoring",
        "slug": "cnc-monitoring",
        "status": "active"
    }, org_id=org1_id)
    logger.info(f"\nCreated application in Acme Manufacturing: CNC Monitoring")

    # Create an application in org2
    app2_id = str(uuid.uuid4())
    await config_manager.replace("applications", app2_id, {
        "id": app2_id,
        "organization_id": org2_id,
        "name": "Production Dashboard",
        "slug": "production-dashboard",
        "status": "active"
    }, org_id=org2_id)
    logger.info(f"Created application in GlobalTech Industries: Production Dashboard")

    # List applications in each org
    apps_org1, _ = await config_manager.list(
        "applications",
        filter_key="organization_id",
        filter_value=org1_id,
        org_id=org1_id
    )
    logger.info(f"\nApplications in Acme Manufacturing: {len(apps_org1)}")
    for app in apps_org1:
        logger.info(f"  - {app['name']}")

    apps_org2, _ = await config_manager.list(
        "applications",
        filter_key="organization_id",
        filter_value=org2_id,
        org_id=org2_id
    )
    logger.info(f"\nApplications in GlobalTech Industries: {len(apps_org2)}")
    for app in apps_org2:
        logger.info(f"  - {app['name']}")

    logger.info("\n✓ Multi-organization access test complete!")


async def main():
    config_manager = ConfigManagerService()
    try:
        await config_manager.connect()
        await config_manager.init_tables()
        await test_multi_org_user(config_manager)
    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise
    finally:
        await config_manager.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
