"""
Test MQTT bridge CRUD via ConfigManagerService.

Tests the bridge tenant table using the base+variants model introduced in
the new bridge configuration format.
"""

import asyncio
import logging
import uuid

from managers.config import ConfigManagerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_mqtt_bridge(db: ConfigManagerService) -> None:
    org_id = str(uuid.uuid4())
    bridge_id = str(uuid.uuid4())

    # --- setup org ---
    await db.replace("organizations", org_id, {
        "id": org_id,
        "name": "Test Org",
        "slug": "test-org",
        "status": "active",
    })
    await db.init_tenant_tables(org_id)
    logger.info(f"Org ready: {org_id}")

    # --- create ---
    bridge_data = {
        "id": bridge_id,
        "organization_id": org_id,
        "name": "emqx",
        "type": "mqtt",
        "is_default": True,
        "is_enabled": True,
        "description": "EMQX cloud broker",
        "base": {
            "host": "w631c003.ala.us-east-1.emqxsl.com",
            "port": 8883,
            "tls": True,
        },
        "variants": {
            "dev": {
                "username": "juan",
                "password": "secret-dev",
                "topics": [{"name": "mma", "decoder": "bytes"}],
            },
            "prod": {
                "username": "prod-user",
                "password": "secret-prod",
                "topics": [{"name": "mma", "decoder": "bytes"}],
            },
        },
    }
    created = await db.create("bridges", bridge_id, bridge_data, org_id=org_id)
    assert created["id"] == bridge_id
    assert created["name"] == "emqx"
    assert created["type"] == "mqtt"
    assert created["is_default"] is True
    assert created["base"]["host"] == "w631c003.ala.us-east-1.emqxsl.com"
    assert created["variants"]["dev"]["username"] == "juan"
    logger.info(f"Bridge created: {bridge_id}")

    # --- read back ---
    fetched = await db.get("bridges", bridge_id, org_id=org_id)
    assert fetched is not None
    assert fetched["name"] == "emqx"
    assert fetched["base"]["port"] == 8883
    assert fetched["variants"]["prod"]["password"] == "secret-prod"
    logger.info("Bridge fetched OK")

    # --- list ---
    items, total = await db.list(
        "bridges",
        filter_key="organization_id",
        filter_value=org_id,
        org_id=org_id,
    )
    assert total == 1
    assert items[0]["id"] == bridge_id
    logger.info(f"Bridge list OK: {total} bridge(s)")

    # --- update (rename + add variant) ---
    updated = await db.update("bridges", bridge_id, {
        "description": "Updated description",
        "is_default": False,
    }, org_id=org_id)
    assert updated["description"] == "Updated description"
    assert updated["is_default"] is False
    logger.info("Bridge updated OK")

    # --- delete ---
    deleted = await db.delete("bridges", bridge_id, org_id=org_id)
    assert deleted is True
    gone = await db.get("bridges", bridge_id, org_id=org_id)
    assert gone is None
    logger.info("Bridge deleted OK")

    # --- teardown org ---
    await db.delete("organizations", org_id)
    logger.info("Test passed.")


async def main() -> None:
    db = ConfigManagerService()
    try:
        await db.connect()
        await db.init_tables()
        await test_mqtt_bridge(db)
    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
