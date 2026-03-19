import asyncio
import json
from api.database import ConfigManagerService

async def check_tables():
    org_id = "a75aeb13-8f88-4fba-b30e-d0f00d4b5531"
    db = ConfigManagerService()
    await db.connect()
    
    query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    
    print(f"\nChecking tables for Global DB:")
    global_tables = await db.execute(query)
    print(json.dumps(global_tables, indent=2))
    
    print(f"\nChecking tables for Tenant DB ({org_id}):")
    tenant_tables = await db.execute(query, org_id=org_id)
    print(json.dumps(tenant_tables, indent=2))
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_tables())
