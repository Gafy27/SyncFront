"""
Interactive test client for the Syncore data engineer agent.

Requires:
  - API server running:    poetry run python api/main.py
  - Temporal running:      docker-compose -f dependencies-compose.yml up -d
  - Agent worker running:  LLM_MODEL=anthropic/claude-sonnet-4-6 \\
                           LLM_KEY=$ANTHROPIC_API_KEY \\
                           SHOW_CONFIRM=false \\
                           poetry run python agent/worker.py

Usage:
  EMAIL=admin@example.com PASSWORD=secret ORG_ID=<uuid> poetry run python api/test/test_agent.py
"""

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import httpx

API_URL = os.environ.get("API_URL", "http://localhost:8001")
EMAIL = os.environ.get("EMAIL", "gvarela@autentio.com.ar")
PASSWORD = os.environ.get("PASSWORD", "Golesderiver27")
ORG_ID = os.environ.get("ORG_ID", "c3aad060-e1ce-4b99-bfeb-f710ab2088c0")

POLL_INTERVAL = 0.5   # seconds between history polls
POLL_TIMEOUT = 60     # seconds to wait for an agent response

# ANSI colors
_RESET = "\033[0m"
_BOLD = "\033[1m"
_CYAN = "\033[96m"
_GREEN = "\033[92m"
_YELLOW = "\033[93m"
_RED = "\033[91m"
_DIM = "\033[2m"


def _color(text: str, code: str) -> str:
    return f"{code}{text}{_RESET}"


def _print_message(actor: str, response) -> None:
    if actor == "user":
        print(f"\n{_color('You:', _BOLD + _CYAN)} {response}")
    elif actor == "agent":
        if isinstance(response, dict):
            resp_text = response.get("response", str(response))
            print(f"\n{_color('Agent:', _BOLD + _GREEN)} {resp_text}")
        else:
            print(f"\n{_color('Agent:', _BOLD + _GREEN)} {response}")
    elif actor == "tool_result":
        if isinstance(response, dict) and "error" not in response:
            print(f"\n{_color('Tool result:', _DIM + _YELLOW)} {response}")
        elif isinstance(response, dict):
            print(f"\n{_color('Tool error:', _RED)} {response}")
    elif actor == "user_confirmed_tool_run":
        tool = response.get("tool", "?") if isinstance(response, dict) else response
        print(f"\n{_color(f'✓ Confirmed: {tool}', _DIM)}")


class AgentClient:
    def __init__(self, token: str, org_id: str):
        self.headers = {"Authorization": f"Bearer {token}"}
        self.org_id = org_id
        self.session_id: str | None = None
        self._last_message_count = 0

    def _get(self, path: str) -> dict:
        with httpx.Client() as client:
            r = client.get(f"{API_URL}{path}", headers=self.headers, timeout=10)
            r.raise_for_status()
            return r.json()

    def _post(self, path: str, body: dict | None = None) -> dict:
        with httpx.Client() as client:
            r = client.post(f"{API_URL}{path}", headers=self.headers, json=body or {}, timeout=10)
            r.raise_for_status()
            return r.json()

    def list_goals(self) -> list[dict]:
        return self._get("/api/agent/goals")

    def start(self, goal_id: str, initial_prompt: str | None = None) -> str:
        result = self._post(
            f"/api/agent/{self.org_id}/start",
            {"goal_id": goal_id, "initial_prompt": initial_prompt},
        )
        self.session_id = result["session_id"]
        self._last_message_count = 0
        return result.get("starter_prompt", "")

    def send_prompt(self, prompt: str) -> None:
        self._post(f"/api/agent/{self.session_id}/prompt", {"prompt": prompt})

    def get_history(self) -> list[dict]:
        data = self._get(f"/api/agent/{self.session_id}/history")
        return data.get("messages", [])

    def get_tool_data(self) -> dict:
        return self._get(f"/api/agent/{self.session_id}/tool-data")

    def confirm(self) -> None:
        self._post(f"/api/agent/{self.session_id}/confirm")

    def end(self) -> None:
        self._post(f"/api/agent/{self.session_id}/end")

    def wait_for_response(self) -> list[dict]:
        """Poll history until new messages appear. Returns only the new messages."""
        deadline = time.time() + POLL_TIMEOUT
        while time.time() < deadline:
            messages = self.get_history()
            if len(messages) > self._last_message_count:
                new = messages[self._last_message_count:]
                # Wait until the last new message is from the agent (LLM done processing)
                last_actor = new[-1].get("actor", "")
                if last_actor == "agent":
                    self._last_message_count = len(messages)
                    return new
            time.sleep(POLL_INTERVAL)
        return []


def _login(email: str, password: str) -> str:
    with httpx.Client() as client:
        r = client.post(
            f"{API_URL}/api/auth/login",
            data={"username": email, "password": password},
            timeout=10,
        )
        if r.status_code != 200:
            print(_color(f"Login failed ({r.status_code}): {r.text}", _RED))
            sys.exit(1)
        return r.json()["access_token"]


def _pick_org(token: str) -> str:
    if ORG_ID:
        return ORG_ID
    with httpx.Client() as client:
        r = client.get(
            f"{API_URL}/api/organizations",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        r.raise_for_status()
        orgs = r.json()
        # The response may be a list or a dict with 'items'
        if isinstance(orgs, dict) and "items" in orgs:
            orgs = orgs.get("items", [])
        elif not isinstance(orgs, list):
            print(_color("Unexpected organizations response format.", _RED))
            sys.exit(1)
        if not orgs:
            print(_color("No organizations found. Create one first.", _RED))
            sys.exit(1)
        if len(orgs) == 1:
            return str(orgs[0]["id"])
        print("\nAvailable organizations:")
        for i, org in enumerate(orgs):
            print(f"  [{i + 1}] {org['name']} ({org['id']})")
        idx = int(input("Pick organization number: ")) - 1
        return str(orgs[idx]["id"])


def _pick_goal(client: AgentClient) -> str:
    goals = client.list_goals()
    print(f"\n{_color('Available goals:', _BOLD)}")
    for i, goal in enumerate(goals):
        print(f"  [{i + 1}] {_color(goal['name'], _GREEN)} — {goal['description']}")
    idx = int(input("\nPick goal number: ")) - 1
    return goals[idx]["id"]


def _run(client: AgentClient) -> None:
    goal_id = _pick_goal(client)
    starter = client.start(goal_id)

    print(f"\n{_color('Session started.', _BOLD)} Type your messages below.")
    print(_color("Commands: 'exit' to end, 'confirm' to approve a pending tool.\n", _DIM))

    # Show the starter prompt returned by the API (workflow is now idle, waiting for user input)
    if starter:
        print(f"\n{_color('Agent:', _BOLD + _GREEN)} {starter}")

    print(_color("(Tip: press Enter on a blank line to send a multi-line message)", _DIM))

    while True:
        try:
            first_line = input(f"\n{_color('You:', _BOLD + _CYAN)} ")
        except (KeyboardInterrupt, EOFError):
            first_line = "exit"

        if not first_line.strip():
            continue

        # Collect additional lines until the user submits a blank line
        lines = [first_line]
        while True:
            try:
                line = input()
            except (KeyboardInterrupt, EOFError):
                break
            if not line:
                break
            lines.append(line)

        user_input = "\n".join(lines).strip()

        if not user_input:
            continue

        if user_input.lower() == "exit":
            client.end()
            print(_color("\nSession ended.", _DIM))
            break

        if user_input.lower() == "confirm":
            tool_data = client.get_tool_data()
            if tool_data.get("next") == "confirm":
                tool = tool_data.get("tool", "unknown")
                args = tool_data.get("args", {})
                print(_color(f"\nConfirming tool '{tool}' with args: {args}", _YELLOW))
                client.confirm()
                new_msgs = client.wait_for_response()
                for msg in new_msgs:
                    _print_message(msg.get("actor"), msg.get("response"))
            else:
                print(_color("No tool pending confirmation.", _DIM))
            continue

        client.send_prompt(user_input)

        new_msgs = client.wait_for_response()
        if not new_msgs:
            print(_color("(No response received — check that the worker is running)", _RED))
            continue

        for msg in new_msgs:
            actor = msg.get("actor")
            if actor == "user":
                continue  # already printed
            response = msg.get("response")
            _print_message(actor, response)

        # Check if a tool is waiting for confirmation
        tool_data = client.get_tool_data()
        if isinstance(tool_data, dict) and tool_data.get("next") == "confirm":
            tool = tool_data.get("tool", "?")
            args = tool_data.get("args", {})
            print(_color(f"\n⚡ Tool ready to run: '{tool}'", _YELLOW))
            print(_color(f"   Args: {args}", _DIM))
            confirm = input(_color("   Confirm? [y/N]: ", _YELLOW)).strip().lower()
            if confirm == "y":
                client.confirm()
                confirmed_msgs = client.wait_for_response()
                for msg in confirmed_msgs:
                    _print_message(msg.get("actor"), msg.get("response"))


def main() -> None:
    print(_color("=== Syncore Data Engineer Agent ===", _BOLD))
    print(_color("Requires: API server + Temporal + agent worker running\n", _DIM))

    print(f"Connecting to {API_URL} as {EMAIL}...")
    token = _login(EMAIL, PASSWORD)
    print(_color("Logged in.", _GREEN))

    org_id = _pick_org(token)
    print(_color(f"Using organization: {org_id}", _DIM))

    client = AgentClient(token, org_id)
    _run(client)


if __name__ == "__main__":
    main()
