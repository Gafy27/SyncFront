"""
Agent router for Syncore data engineer AI agent.

Routes:
- POST /api/agent/{org_id}/start
- GET  /api/agent/{org_id}/sessions
- POST /api/agent/{session_id}/prompt
- GET  /api/agent/sessions/{session_id}
- GET  /api/agent/{session_id}/history
- GET  /api/agent/{session_id}/tool-data
- POST /api/agent/{session_id}/confirm
- POST /api/agent/{session_id}/end
"""

import asyncio
import json
import time
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from temporalio.client import Client
from temporalio.service import RPCError

from agent.config import AgentSettings
from agent.models.data_types import AgentWorkflowInput
from agent.temporal.workflows.agent_workflow import AgentWorkflow

router = APIRouter()

_settings = AgentSettings()


async def _get_client() -> Client:
    return await Client.connect(_settings.temporal_address)


class StartAgentRequest(BaseModel):
    user_id: str
    default_bridge: str = "postgres"
    default_instance: str = "main"
    initial_prompt: str | None = None
    resume_session_id: str | None = None


class PromptRequest(BaseModel):
    prompt: str


@router.post("/{org_id}/start")
async def start_agent_session(org_id: uuid.UUID, request: StartAgentRequest):
    """Start a new agent session for the given organization."""
    session_id = f"agent-{org_id}-{request.user_id}-{uuid.uuid4().hex[:8]}"

    message_history: list[dict] = []
    session_summary: str = ""

    llm_messages: list[dict] = []
    if request.resume_session_id:
        from managers.config import db
        prior = await db.get("sessions", request.resume_session_id)
        if prior:
            message_history = prior.get("display_messages", [])
            llm_messages = prior.get("llm_messages", [])
            session_summary = prior.get("session_summary", "")

    workflow_input = AgentWorkflowInput(
        org_id=str(org_id),
        user_id=request.user_id,
        session_id=session_id,
        default_bridge=request.default_bridge,
        default_instance=request.default_instance,
        session_summary=session_summary,
        message_history=message_history,
        llm_messages=llm_messages,
    )

    client = await _get_client()
    handle = await client.start_workflow(
        AgentWorkflow.run,
        workflow_input,
        id=session_id,
        task_queue=_settings.task_queue,
    )

    if request.initial_prompt:
        await handle.signal(AgentWorkflow.user_prompt, request.initial_prompt)

    return {"session_id": session_id}


@router.post("/{session_id}/prompt")
async def send_prompt(session_id: str, request: PromptRequest):
    """Send a message to an active agent session."""
    client = await _get_client()
    try:
        handle = client.get_workflow_handle(session_id)
        await handle.signal(AgentWorkflow.user_prompt, request.prompt)
    except RPCError as e:
        raise HTTPException(status_code=404, detail=f"Session not found: {e}") from e
    return {"status": "sent"}


@router.get("/{org_id}/sessions")
async def list_org_sessions(org_id: uuid.UUID, limit: int = 50, offset: int = 0):
    """List all stored sessions for an organization, newest first."""
    from managers.config import db
    records, total = await db.list(
        "sessions",
        filter_key="org_id",
        filter_value=str(org_id),
        limit=limit,
        offset=offset,
    )
    sessions = [
        {
            "session_id": r.get("session_id", r["id"]),
            "org_id": r.get("org_id"),
            "session_summary": r.get("session_summary", ""),
            "message_count": len(r.get("display_messages", [])),
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at"),
        }
        for r in records
    ]
    return {"sessions": sessions, "total": total}


@router.get("/sessions/{session_id}")
async def get_stored_session(session_id: str):
    """Get stored session history from the database (works even after the workflow has ended)."""
    from managers.config import db
    session = await db.get("sessions", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/{session_id}/stream")
async def stream_session(session_id: str, timeout: int = 300):
    """SSE stream of conversation events. Pushes new messages as they appear in the workflow."""

    async def generate():
        client = await _get_client()
        seen = 0
        deadline = time.time() + timeout

        while time.time() < deadline:
            try:
                handle = client.get_workflow_handle(session_id)
                history = await handle.query(AgentWorkflow.get_conversation_history)
                messages = history.get("messages", [])

                for msg in messages[seen:]:
                    yield f"data: {json.dumps(msg)}\n\n"
                seen = len(messages)

                tool_data = await handle.query(AgentWorkflow.get_latest_tool_data)
                if tool_data and tool_data.get("requires_confirmation"):
                    yield f"event: confirm\ndata: {json.dumps(tool_data)}\n\n"

            except RPCError:
                yield f"event: ended\ndata: {json.dumps({'status': 'ended'})}\n\n"
                return

            await asyncio.sleep(0.5)

        yield f"event: timeout\ndata: {json.dumps({'status': 'timeout'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{session_id}/history")
async def get_history(session_id: str):
    """Get the full conversation history for a session."""
    client = await _get_client()
    try:
        handle = client.get_workflow_handle(session_id)
        history = await handle.query(AgentWorkflow.get_conversation_history)
    except RPCError as e:
        raise HTTPException(status_code=404, detail=f"Session not found: {e}") from e
    return history


@router.get("/{session_id}/tool-data")
async def get_tool_data(session_id: str):
    """Get the latest tool data (LLM decision) from an active session."""
    client = await _get_client()
    try:
        handle = client.get_workflow_handle(session_id)
        tool_data = await handle.query(AgentWorkflow.get_latest_tool_data)
    except RPCError as e:
        raise HTTPException(status_code=404, detail=f"Session not found: {e}") from e
    return tool_data or {}


@router.post("/{session_id}/confirm")
async def confirm_tool(session_id: str):
    """Confirm the pending tool execution in a session."""
    client = await _get_client()
    try:
        handle = client.get_workflow_handle(session_id)
        await handle.signal(AgentWorkflow.confirm)
    except RPCError as e:
        raise HTTPException(status_code=404, detail=f"Session not found: {e}") from e
    return {"status": "confirmed"}


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    """End an active agent session."""
    client = await _get_client()
    try:
        handle = client.get_workflow_handle(session_id)
        await handle.signal(AgentWorkflow.end_chat)
    except RPCError as e:
        raise HTTPException(status_code=404, detail=f"Session not found: {e}") from e
    return {"status": "ended"}
