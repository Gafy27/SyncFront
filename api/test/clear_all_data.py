"""Clear all data from API entity tables."""
import asyncio
import logging
import sys
from pathlib import Path

# Project root so 'api' and other packages resolve
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from api.database import ConfigManagerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    cm = ConfigManagerService()
    try:
        await cm.connect()
        await cm.clear_all_data()
        logger.info("All API data cleared.")
    finally:
        await cm.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
