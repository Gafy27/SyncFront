"""
Simple tests for WorkflowManagerService.

Mocks Kafka and config loading so no infrastructure is needed.
Run with:  python api/test/test_workflow_manager.py
"""

import asyncio
import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from managers.workflow import WorkflowManagerService, VALID_SIGNALS

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_manager_with_mock_producer():
    """Return a (WorkflowManagerService, mock_producer) pair.

    The manager's _ibridge is pre-wired so no real connections are made.
    """
    mock_producer = MagicMock()
    mock_bridge = MagicMock()
    mock_bridge.producer = mock_producer

    manager = WorkflowManagerService()
    manager._ibridge = mock_bridge
    manager._signal_topic = "signal"
    return manager, mock_producer


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_produce_sends_correct_message():
    """produce() should call producer.produce() with the right topic and payload."""
    manager, mock_producer = _make_manager_with_mock_producer()
    workflow_id = str(uuid.uuid4())

    await manager.produce(workflow_id, "start")

    mock_producer.produce.assert_called_once()
    call_kwargs = mock_producer.produce.call_args.kwargs

    assert call_kwargs["topic"] == "signal"
    assert call_kwargs["key"] == workflow_id

    payload = json.loads(call_kwargs["value"])
    assert payload["event_id"] == "signal"
    assert payload["value"] == "start"
    assert payload["target_service"] == workflow_id
    assert payload["machine_id"] == "api"

    mock_producer.flush.assert_called_once()
    print("PASS  test_produce_sends_correct_message")


async def test_all_valid_signals():
    """Every signal in VALID_SIGNALS should be accepted without error."""
    for signal in VALID_SIGNALS:
        manager, mock_producer = _make_manager_with_mock_producer()
        await manager.produce(str(uuid.uuid4()), signal)
        mock_producer.produce.assert_called_once()
    print("PASS  test_all_valid_signals")


async def test_invalid_signal_raises():
    """An unknown signal should raise ValueError."""
    manager, _ = _make_manager_with_mock_producer()
    try:
        await manager.produce(str(uuid.uuid4()), "launch")
        print("FAIL  test_invalid_signal_raises  (no exception raised)")
    except ValueError as e:
        assert "launch" in str(e)
        print("PASS  test_invalid_signal_raises")


async def test_uuid_object_accepted():
    """produce() should accept a UUID object (not just a string)."""
    manager, mock_producer = _make_manager_with_mock_producer()
    workflow_id = uuid.uuid4()

    await manager.produce(workflow_id, "stop")

    call_kwargs = mock_producer.produce.call_args.kwargs
    assert call_kwargs["key"] == str(workflow_id)
    print("PASS  test_uuid_object_accepted")


async def test_producer_flush_called():
    """flush() must always be called after produce() to ensure delivery."""
    manager, mock_producer = _make_manager_with_mock_producer()

    await manager.produce(str(uuid.uuid4()), "terminate")

    mock_producer.flush.assert_called_once()
    print("PASS  test_producer_flush_called")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

async def main():
    tests = [
        test_produce_sends_correct_message,
        test_all_valid_signals,
        test_invalid_signal_raises,
        test_uuid_object_accepted,
        test_producer_flush_called,
    ]
    failed = 0
    for test in tests:
        try:
            await test()
        except Exception as e:
            print(f"FAIL  {test.__name__}  ({e})")
            failed += 1

    print(f"\n{len(tests) - failed}/{len(tests)} tests passed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
