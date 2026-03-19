"""
Debug test: checks why login fails.
Run from the Syncore root:
    poetry run python api/test/test_login_debug.py
"""

import asyncio
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from managers.config import ConfigManagerService
from api.auth import verify_password


async def debug_login(email: str, password: str):
    db = ConfigManagerService()
    await db.connect()

    print(f"\n=== Login debug for: {email} ===")

    users, _ = await db.list("users", filter_key="email", filter_value=email, limit=1)
    if not users:
        print(f"[FAIL] No user found with email '{email}'")
        await db.disconnect()
        return

    user = users[0]
    print(f"[OK]   User found: id={user.get('id')}, name={user.get('name')}, status={user.get('status')}")

    password_hash = user.get("password_hash")
    if not password_hash:
        print(f"[FAIL] User has no password_hash — was created without a password (e.g. via seed script)")
        print(f"       Fix: re-create the user with create_admin.py")
        await db.disconnect()
        return

    print(f"[OK]   password_hash present")

    if not verify_password(password, password_hash):
        print(f"[FAIL] Password does not match")
    else:
        print(f"[OK]   Password matches — login should succeed")

    status = user.get("status")
    if status in ("inactive", "suspended"):
        print(f"[FAIL] User account is {status}")
    else:
        print(f"[OK]   Account status: {status}")

    await db.disconnect()


if __name__ == "__main__":
    # Test the two known users
    asyncio.run(debug_login("gvarela@autentio.com", "Golesderiver27"))
    asyncio.run(debug_login("admin@autentio.app", ""))  # seeded without password
