import asyncio
import json
import sys
import os

# Add flights-mcp-server to path
sys.path.append(os.path.join(os.getcwd(), 'frontend', 'flights-mcp-server'))
from flights import get_general_flights_info

async def main():
    try:
        res = await get_general_flights_info('BOM', 'DEL', '2026-05-15')
        print(json.dumps({"success": True, "results": res}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

asyncio.run(main())
