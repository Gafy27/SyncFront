"""
Test fetching workflow run logs and activity logs via the API.

Uses the real API at localhost:8001 with existing data:
  org      : c3aad060-e1ce-4b99-bfeb-f710ab2088c0  (autentio)
  workflow : aeb862f9-d6cf-4a08-9277-e0db9aa8a059  (OEE)
"""

import json
import sys
import httpx

BASE = "http://localhost:8001"
EMAIL = "gvarela@autentio.com.ar"
PASSWORD = "Golesderiver27"
ORG_ID = "c3aad060-e1ce-4b99-bfeb-f710ab2088c0"
WORKFLOW_ID = "aeb862f9-d6cf-4a08-9277-e0db9aa8a059"


def _dump(label: str, data: dict) -> None:
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

        # --- list runs ---
        url = f"/api/organizations/{ORG_ID}/workflows/{WORKFLOW_ID}/runs"
        resp = client.get(url, headers=headers)
        assert resp.status_code == 200, f"list_runs failed: {resp.status_code} {resp.text}"
        runs_payload = resp.json()
        _dump("Workflow runs", runs_payload)

        assert runs_payload["total"] > 0, "Expected at least one run"
        run_id = runs_payload["items"][0]["run_id"]

        # --- list activities for first run ---
        url = f"/api/organizations/{ORG_ID}/workflows/{WORKFLOW_ID}/runs/{run_id}"
        resp = client.get(url, headers=headers)
        assert resp.status_code == 200, f"list_activities failed: {resp.status_code} {resp.text}"
        acts_payload = resp.json()
        _dump(f"Activities for run {run_id}", acts_payload)

        assert acts_payload["total"] > 0, "Expected at least one activity"

        print("\nAll assertions passed.")


if __name__ == "__main__":
    main()
