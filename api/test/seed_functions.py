"""
Seed the built-in batch UDF functions into the function repository for an org.

Idempotent — skips any function that already exists by name.

Usage:
    poetry run python scripts/seed_functions.py --org-id <org_id>
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

_FUNCTIONS_DIR = Path(__file__).resolve().parents[2] / "core" / "batch" / "functions"
from managers.config import ConfigManagerService
from managers.function import FunctionManagerService

BUILTIN_FUNCTIONS = [
    {
        "name": "state_duration",
        "source_file": "state_duration.py",
        "description": (
            "Computes the duration of each machine state within a batch window. "
            "Expects a DataFrame with at least a timestamp column and a 'machine_id' column. "
            "Adds a 'duration' column (milliseconds) representing how long each state lasted. "
            "Use when computing state-based KPIs such as uptime, downtime, or cycle time. "
            "Parameters: df (DataFrame), window (Window), time_column (str, default 'ts'), "
            "previous_state (Series|dict|None)."
        ),
        "parameters": ["df", "window", "time_column", "previous_state"],
    },
    {
        "name": "anomaly_cleaner",
        "source_file": "anomaly.py",
        "description": (
            "Removes statistical outliers from a numeric column using MAD-based z-score filtering. "
            "MAD (Median Absolute Deviation) is more robust than standard deviation for time-series data. "
            "Adds a 'mad_z_score' column and filters rows where the score exceeds the threshold. "
            "Use before aggregations to prevent anomalous readings from skewing results. "
            "Parameters: df (DataFrame), target_col (str), threshold (float, default 3.0), debug (bool)."
        ),
        "parameters": ["df", "target_col", "threshold", "debug"],
    },
    {
        "name": "window_limit_builder",
        "source_file": "window_limit.py",
        "description": (
            "Builds the SQL boolean expression for the WINDOW_LIMIT custom function. "
            "Returns a half-open interval filter [window_start, window_stop) using the batch context timestamps. "
            "Use internally when constructing SQL queries that must restrict rows to the current batch window. "
            "Parameters: ctx (BatchContext)."
        ),
        "parameters": ["ctx"],
    },
]


async def seed_functions(org_id: str) -> None:


    db = ConfigManagerService()
    await db.connect()
    await db.init_tenant_tables(org_id)

    svc = FunctionManagerService()
    existing, _ = await db.list("functions", org_id=org_id)
    existing_names = {r["name"] for r in existing}

    seeded = 0
    skipped = 0

    for entry in BUILTIN_FUNCTIONS:
        if entry["name"] in existing_names:
            print(f"  skip  {entry['name']} (already exists)")
            skipped += 1
            continue

        code = (_FUNCTIONS_DIR / entry["source_file"]).read_text()
        result = await svc.create_function({
            "org_id": org_id,
            "name": entry["name"],
            "description": entry["description"],
            "code": code,
            "parameters": entry["parameters"],
        })

        if "error" in result:
            print(f"  error {entry['name']}: {result['error']}")
        else:
            print(f"  added {entry['name']}")
            seeded += 1

    await db.disconnect()
    print(f"\nDone — {seeded} added, {skipped} skipped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed built-in batch functions for an org")
    parser.add_argument("--org-id", required=True, help="Organization UUID")
    args = parser.parse_args()

    asyncio.run(seed_functions(args.org_id))
