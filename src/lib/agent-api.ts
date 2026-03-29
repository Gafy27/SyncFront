import { API_BASE_URL, getAuthToken } from "./api"

export interface AgentMessage {
  id?: string
  role: "user" | "assistant" | "tool" | "tool_call" | "tool_result" | "reasoning" | "system"
  content: string
  language?: string
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
  reasoning?: string
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
  start: (
    orgId: string,
    userId: string,
    opts?: {
      initialPrompt?: string
      resumeSessionId?: string
      defaultBridge?: string
      /** Human-readable space name for the workflow (JSON `space_name`), not a UUID. */
      spaceName?: string
    }
  ) => {
    const path = `/api/agent/${orgId}/start`
    const spaceName = opts?.spaceName?.trim()
    const body: Record<string, unknown> = {
      user_id: userId,
      initial_prompt: opts?.initialPrompt,
      resume_session_id: opts?.resumeSessionId,
      default_bridge: opts?.defaultBridge,
    }
    if (spaceName) body.space_name = spaceName

    if (import.meta.env.DEV) {
      console.debug("[agentApi.start]", { url: `${API_BASE_URL}${path}`, body })
    }
    return agentFetch<{ session_id: string }>(path, {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

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

  reject: (sessionId: string) =>
    agentFetch<{ status: string }>(`/api/agent/${sessionId}/reject`, {
      method: "POST",
    }),

  end: (sessionId: string) =>
    agentFetch<{ status: string }>(`/api/agent/${sessionId}/end`, {
      method: "POST",
    }),
}
