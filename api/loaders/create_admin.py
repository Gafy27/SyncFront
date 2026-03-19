"""
Bootstrap script: create an initial admin user.

Usage:
    poetry run python api/create_admin.py
    poetry run python api/create_admin.py --email admin@example.com --password secret123
"""

import argparse
import asyncio
from pathlib import Path
import uuid
import os 
from dotenv import load_dotenv
import sys
load_dotenv()

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from managers.config import ConfigManagerService
from api.auth import hash_password


async def create_admin(email: str, password: str, name: str):
    db = ConfigManagerService()
    await db.connect()
    await db.init_tables()

    # Check if user already exists
    users, _ = await db.list("users", filter_key="email", filter_value=email, limit=1)
    if users:
        print(f"User '{email}' already exists (id={users[0]['id']}). Nothing changed.")
        return

    user_id = str(uuid.uuid4())
    await db.create("users", user_id, {
        "id": user_id,
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "status": "active",
        "role": "owner",
    })
    print(f"Admin user created:")
    print(f"  id    : {user_id}")
    print(f"  email : {email}")
    print(f"  name  : {name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create initial admin user")
    parser.add_argument("--email", default="gvarela@autentio.com")
    parser.add_argument("--password", default="Golesderiver27")
    parser.add_argument("--name", default="Admin")
    args = parser.parse_args()

    asyncio.run(create_admin(args.email, args.password, args.name))
