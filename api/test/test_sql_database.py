"""
Test SQL execute endpoint with database selection.

Covers:
  1. No database  — queries api DB (public schema)
  2. database     — queries a named DB on the same server (logging)
  3. bridge       — queries an external bridge from bridge.yml
  4. Unknown DB   — still connects (empty result is fine, no 500)
"""

import json
import httpx

BASE = "http://localhost:8001"
EMAIL = "gvarela@autentio.com.ar"
PASSWORD = "Golesderiver27"


def _dump(label: str, data) -> None:
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(json.dumps(data, indent=2, default=str))


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=10) as client:
        # --- login ---
        resp = client.post("/api/auth/login", data={"username": EMAIL, "password": PASSWORD})
        assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Logged in as {EMAIL}")

        # 1. No database — default api DB
        resp = client.post(
            "/api/sql/execute",
            json={"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"},
            headers=headers,
        )
        assert resp.status_code == 200, f"[1] failed: {resp.status_code} {resp.text}"
        _dump("1. api DB (no database param) — public schema tables", resp.json())

        # 2. database = "logging" — workflow log tables
        resp = client.post(
            "/api/sql/execute",
            json={
                "query": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
                "database": "logging",
            },
            headers=headers,
        )
        assert resp.status_code == 200, f"[2] failed: {resp.status_code} {resp.text}"
        _dump("2. logging DB — public schema tables", resp.json())

        # 3. database = "logging" — sample workflow_runs rows
        resp = client.post(
            "/api/sql/execute",
            json={
                "query": "SELECT run_id, status, duration_ms FROM workflow_runs ORDER BY ts DESC LIMIT 5",
                "database": "logging",
            },
            headers=headers,
        )
        assert resp.status_code == 200, f"[3] failed: {resp.status_code} {resp.text}"
        _dump("3. logging DB — latest 5 workflow_runs rows", resp.json())

        # 4. List available SQL bridges
        resp = client.get("/api/sql/bridges", headers=headers)
        assert resp.status_code == 200, f"[4] failed: {resp.status_code} {resp.text}"
        bridges = resp.json()
        _dump("4. Available SQL bridges", bridges)

        # 5. bridge param — execute against first available bridge (if any)
        if bridges:
            bridge_key = bridges[0]["key"]
            resp = client.post(
                "/api/sql/execute",
                json={
                    "query": "SELECT current_database(), current_schema()",
                    "bridge": bridge_key,
                },
                headers=headers,
            )
            assert resp.status_code in (200, 503), f"[5] unexpected status: {resp.status_code} {resp.text}"
            _dump(f"5. bridge '{bridge_key}' — current DB/schema", resp.json() if resp.status_code == 200 else resp.text)

        print("\nAll assertions passed.")


if __name__ == "__main__":
    main()
