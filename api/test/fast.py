import asyncio
import logging
import uuid

from api.database import ConfigManagerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_data(config_manager: ConfigManagerService):
    """Populate tables with seed data matching current API models."""
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    machine_id = str(uuid.uuid4())
    service_id = str(uuid.uuid4())
    template_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    workflow_id = str(uuid.uuid4())
    table_id = str(uuid.uuid4())

    logger.info("Starting seed process...")

    # 1. Organization (Global)
    await config_manager.replace("organizations", org_id, {
        "id": org_id,
        "name": "Autentio",
        "slug": "autentio",
        "description": "Default organization for SyncCore",
        "status": "active",
        "settings": {
            "features": {"alerts_enabled": True, "export_enabled": True, "api_access": True},
        },
    })
    logger.info(f"Seeded Organization: {org_id}")

    # Initialize Tenant Database and Tables
    logger.info(f"Initializing tenant database for org {org_id}...")
    await config_manager.init_tenant_tables(org_id)

    # 2. User (Global)
    await config_manager.replace("users", user_id, {
        "id": user_id,
        "name": "Admin User",
        "email": "admin@autentio.app",
        "status": "active",
    })
    logger.info(f"Seeded User: {user_id}")

    # 2b. User Organization Membership (Global)
    membership_id = f"{user_id}_{org_id}"
    await config_manager.replace("user_organizations", membership_id, {
        "id": membership_id,
        "user_id": user_id,
        "organization_id": org_id,
        "role": "owner",
        "status": "active",
    })
    logger.info(f"Seeded User-Organization membership: {membership_id}")

    # 3. Connector Template (Global)
    await config_manager.replace("connector_templates", template_id, {
        "id": template_id,
        "name": "OPC UA Driver",
        "slug": "opcua-template",
        "driver": "opcua",
        "version": "1.0.0",
        "is_active": True,
        "variables": [
            {"name": "host", "label": "Host", "type": "string", "required": True},
            {"name": "port", "label": "Port", "type": "integer", "default": 4840},
        ],
        "collections": [{"name": "machines", "label": "Machines"}],
    })
    logger.info(f"Seeded ConnectorTemplate: {template_id}")

    # 4. Service (Global)
    await config_manager.replace("services", service_id, {
        "id": service_id,
        "name": "MQTT Broker",
        "type": "mqtt",
        "enabled": True,
        "configuration": {"host": "localhost", "port": 1883},
    })
    logger.info(f"Seeded Service: {service_id}")

    # 5. Machine (Tenant, org-scoped)
    await config_manager.replace("machines", machine_id, {
        "id": machine_id,
        "organization_id": org_id,
        "name": "CNC Lathe #1",
        "status": "running",
        "bridges": ["opcua-bridge"],
        "events": ["power", "temperature"],
        "properties": {"manufacturer": "Fanuc"},
    }, org_id=org_id)
    logger.info(f"Seeded Machine: {machine_id}")

    # 6. Event (Tenant, org-scoped)
    await config_manager.replace("events", event_id, {
        "id": event_id,
        "organization_id": org_id,
        "event": "power",
        "topic": "machine/power",
        "type": "FLOAT",
        "values_range": [0.0, 100.0],
    }, org_id=org_id)
    logger.info(f"Seeded Event: {event_id}")

    # 7. Batch Workflow (Tenant, org-scoped)
    await config_manager.replace("workflows", workflow_id, {
        "id": workflow_id,
        "organization_id": org_id,
        "name": "OEE Calculation",
        "type": "batch",
        "window": {"type": "tumbling", "size": "30m"},
        "description": None,
        "is_enabled": True,
    }, org_id=org_id)
    logger.info(f"Seeded Workflow: {workflow_id}")

    # 8. Workflow Table
    await config_manager.replace("workflow_tables", table_id, {
        "id": table_id,
        "workflow_id": workflow_id,
        "name": "availability",
        "upsert_constrains": ["machine_id", "shift_id"],
        "time_column": None,
        "time_compression": False,
        "sync_schema": False,
        "function": {"type": "sql", "definition": "SELECT 1"},
        "order": 0,
    }, org_id=org_id)
    logger.info(f"Seeded Table: {table_id}")

    logger.info("Seed complete.")


async def main():
    config_manager = ConfigManagerService()
    try:
        await config_manager.connect()
        await config_manager.init_tables()
        await seed_data(config_manager)
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        await config_manager.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
