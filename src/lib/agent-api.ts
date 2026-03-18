import { API_BASE_URL, getAuthToken } from "./api"

export interface AgentMessage {
  id?: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  reasoning?: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_result?: unknown
  timestamp?: string
}

export interface PendingToolData {
  tool_name: string
  tool_args?: Record<string, unknown>
  tool_input?: Record<string, unknown>
  description?: string
  requires_confirmation?: boolean
}

export class AgentApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "AgentApiError"
  }
}

async function agentFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new AgentApiError(res.status, text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface StoredSession {
  session_id: string
  org_id: string
  session_summary: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface StoredSessionDetail {
  session_id: string
  display_messages: AgentMessage[]
  session_summary: string
}

export const agentApi = {
  start: (orgId: string, userId: string, opts?: { initialPrompt?: string; resumeSessionId?: string }) =>
    agentFetch<{ session_id: string }>(`/api/agent/${orgId}/start`, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        initial_prompt: opts?.initialPrompt,
        resume_session_id: opts?.resumeSessionId,
      }),
    }),

  listSessions: (orgId: string, limit = 20) =>
    agentFetch<{ sessions: StoredSession[]; total: number }>(
      `/api/agent/${orgId}/sessions?limit=${limit}`
    ),

  getStoredSession: (sessionId: string) =>
    agentFetch<StoredSessionDetail>(`/api/agent/sessions/${sessionId}`),

  prompt: (sessionId: string, prompt: string) =>
    agentFetch<{ status: string }>(`/api/agent/${sessionId}/prompt`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  history: (sessionId: string) =>
    agentFetch<AgentMessage[]>(`/api/agent/${sessionId}/history`),

  toolData: (sessionId: string) =>
    agentFetch<PendingToolData | Record<string, never>>(
      `/api/agent/${sessionId}/tool-data`
    ),

  confirm: (sessionId: string) =>
    agentFetch<{ status: string }>(`/api/agent/${sessionId}/confirm`, {
      method: "POST",
    }),

  end: (sessionId: string) =>
    agentFetch<{ status: string }>(`/api/agent/${sessionId}/end`, {
      method: "POST",
    }),
}
