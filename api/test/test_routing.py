import asyncio
import logging
import copy
from api.database import ConfigManagerService
from models.config.bridge_model import BType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_bridge_routing():
    db = ConfigManagerService()
    await db.connect()
    
    org_id = "test_org_uuid"
    logger.info(f"Testing bridge for org: {org_id}")
    
    # Trigger tenant bridge creation
    bridge = db._get_bridge(org_id)
    
    print(f"\nResults for tenant {org_id}:")
    print(f"Bridge Name: {bridge.bridge_name}")
    print(f"System: {bridge.system}")
    print(f"Strategy Type: {type(bridge.strategy)}")
    print(f"Config DB Name: {bridge.strategy.config.dbname}")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_bridge_routing())
