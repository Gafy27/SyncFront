import asyncio
import json
import httpx

API_URL = "http://localhost:8001/api/sql/execute"

async def test_sql_query():
    data = {
        "query": "SELECT * FROM applications",
        "org_id": "a75aeb13-8f88-4fba-b30e-d0f00d4b5531" # Example Org ID
    }
    print(f"Executing Query: {data['query']}")
    print(f"Target URL: {API_URL}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, json=data, timeout=10.0)
            
            if response.status_code == 200:
                print("\n✅ Query successful!")
                data = response.json()
                print(json.dumps(data, indent=2))
            else:
                print(f"\n❌ Query failed: {response.status_code}")
                print(response.text)
                
    except httpx.ConnectError:
        print(f"\n❌ Could not connect to {API_URL}.")
        print("Make sure the API is running: 'poetry run python3 api/main.py'")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_sql_query())
