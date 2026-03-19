import { useState, useRef, useCallback, useEffect } from "react"
import { agentApi, AgentApiError, AgentMessage, PendingToolData, StoredSession } from "@/lib/agent-api"
import { API_BASE_URL, getAuthToken } from "@/lib/api"

const STORAGE_KEY = "agent_chat_session"

function loadSession(): { sessionId: string; messages: AgentMessage[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(sessionId: string, messages: AgentMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, messages }))
  } catch {}
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useAgentChat(orgId: string | null, userId = "user") {
  const saved = loadSession()

  const [sessionId, setSessionId] = useState<string | null>(saved?.sessionId ?? null)
  const [messages, setMessages] = useState<AgentMessage[]>(saved?.messages ?? [])
  const [isStarting, setIsStarting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [pendingTool, setPendingTool] = useState<PendingToolData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // When a stored session is opened but not yet active, holds the stored session ID.
  // The workflow only starts when the user sends the first message.
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(null)

  const streamCleanupRef = useRef<(() => void) | null>(null)
  // Tracks how many messages from the CURRENT workflow we've already added to state.
  // The SSE always replays from index 0, so we skip this many at the start.
  const workflowSeenRef = useRef(0)

  // Persist session + messages whenever they change
  useEffect(() => {
    if (sessionId) {
      saveSession(sessionId, messages)
    }
  }, [sessionId, messages])

  // On mount: if we restored a session, fetch latest history to sync
  useEffect(() => {
    if (!saved?.sessionId) return
    agentApi
      .history(saved.sessionId)
      .then((history) => {
        const msgs: AgentMessage[] = Array.isArray(history)
          ? history
          : (history as { messages?: AgentMessage[] })?.messages ?? []
        if (msgs.length > 0) {
          setMessages(msgs)
          // All restored messages are already "seen" — they belong to this workflow
          workflowSeenRef.current = msgs.length
        }
      })
      .catch(() => {
        clearSession()
        setSessionId(null)
        setMessages([])
        workflowSeenRef.current = 0
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSessionGone = (e: unknown) =>
    e instanceof AgentApiError && (e.status === 404 || e.status === 410)

  const stopStreaming = useCallback(() => {
    if (streamCleanupRef.current) {
      streamCleanupRef.current()
      streamCleanupRef.current = null
    }
  }, [])

  const startStreaming = useCallback(
    (sid: string, skipCount: number) => {
      stopStreaming()

      const controller = new AbortController()
      streamCleanupRef.current = () => controller.abort()

      const token = getAuthToken()

      ;(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/agent/${sid}/stream`, {
            headers: {
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          })

          if (!res.ok || !res.body) {
            if (res.status === 404 || res.status === 410) {
              clearSession()
              setSessionId(null)
              setMessages([])
              setError("Session expired. Please start a new chat.")
              workflowSeenRef.current = 0
            } else {
              console.error("SSE stream failed:", res.status)
            }
            setIsWaiting(false)
            return
          }

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ""
          let currentEvent = "message"
          let streamIndex = 0 // how many messages the backend has sent so far

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              if (line.startsWith("event:")) {
                currentEvent = line.slice(6).trim()
              } else if (line.startsWith("data:")) {
                const raw = line.slice(5).trim()
                if (!raw) continue

                let payload: unknown
                try {
                  payload = JSON.parse(raw)
                } catch {
                  continue
                }

                console.debug("[SSE]", currentEvent, payload)

                if (currentEvent === "confirm") {
                  setPendingTool(payload as PendingToolData)
                  setIsWaiting(false)
                  stopStreaming()
                  return
                }

                if (currentEvent === "ended" || currentEvent === "timeout") {
                  setIsWaiting(false)
                  stopStreaming()
                  return
                }

                // Skip messages we've already shown
                if (streamIndex < skipCount) {
                  streamIndex++
                  currentEvent = "message"
                  continue
                }
                streamIndex++

                const msg = payload as AgentMessage
                setMessages((prev) => [...prev, msg])
                workflowSeenRef.current++

                if (msg.role === "assistant") {
                  setIsWaiting(false)
                }

                currentEvent = "message"
              } else if (line === "") {
                currentEvent = "message"
              }
            }
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            console.error("SSE stream error:", e)
          }
        }
      })()
    },
    [stopStreaming]
  )

  const startSession = useCallback(async () => {
    if (!orgId) return
    setIsStarting(true)
    setError(null)
    setMessages([])
    setPendingTool(null)
    clearSession()
    workflowSeenRef.current = 0
    try {
      const { session_id } = await agentApi.start(orgId, userId)
      setSessionId(session_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session")
    } finally {
      setIsStarting(false)
    }
  }, [orgId, userId])

  const resumeSession = useCallback(async (storedSessionId: string) => {
    stopStreaming()
    setSessionId(null)
    setMessages([])
    setIsStarting(true)
    setError(null)
    setPendingTool(null)
    setPendingResumeId(null)
    clearSession()
    workflowSeenRef.current = 0
    try {
      const stored = await agentApi.getStoredSession(storedSessionId)
      const history = stored.display_messages ?? []
      setMessages(history)
      // Defer workflow start until user sends a message
      setPendingResumeId(storedSessionId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session")
    } finally {
      setIsStarting(false)
    }
  }, [stopStreaming])

  const listSessions = useCallback(async (): Promise<StoredSession[]> => {
    if (!orgId) return []
    try {
      const { sessions } = await agentApi.listSessions(orgId)
      return sessions
    } catch {
      return []
    }
  }, [orgId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (isWaiting) return
      if (!sessionId && !pendingResumeId && !orgId) return

      setMessages((prev) => [...prev, { role: "user", content }])
      workflowSeenRef.current++
      const skipCount = workflowSeenRef.current
      setIsWaiting(true)
      setError(null)

      try {
        // Lazily start the workflow on first message
        let sid = sessionId
        if (!sid) {
          const opts = pendingResumeId ? { resumeSessionId: pendingResumeId } : undefined
          const { session_id } = await agentApi.start(orgId!, userId, opts)
          sid = session_id
          setSessionId(sid)
          setPendingResumeId(null)
        }

        await agentApi.prompt(sid, content)
        startStreaming(sid, skipCount)
      } catch (e) {
        workflowSeenRef.current--
        if (isSessionGone(e)) {
          clearSession()
          setSessionId(null)
          setMessages([])
          setIsWaiting(false)
          setError("Session expired. Please start a new chat.")
          workflowSeenRef.current = 0
        } else {
          setError(e instanceof Error ? e.message : "Failed to send message")
          setIsWaiting(false)
        }
      }
    },
    [sessionId, pendingResumeId, orgId, userId, isWaiting, startStreaming]
  )

  const confirmTool = useCallback(async () => {
    if (!sessionId) return
    setPendingTool(null)
    setIsWaiting(true)
    const skipCount = workflowSeenRef.current
    try {
      await agentApi.confirm(sessionId)
      startStreaming(sessionId, skipCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm")
      setIsWaiting(false)
    }
  }, [sessionId, startStreaming])

  const denyTool = useCallback(async () => {
    if (!sessionId) return
    setPendingTool(null)
    await sendMessage("Please skip that action and do not execute it. Continue without it.")
  }, [sessionId, sendMessage])

  const endSession = useCallback(async () => {
    stopStreaming()
    if (sessionId) {
      try { await agentApi.end(sessionId) } catch {}
    }
    clearSession()
    setSessionId(null)
    setPendingResumeId(null)
    setMessages([])
    setPendingTool(null)
    setIsWaiting(false)
    setError(null)
    workflowSeenRef.current = 0
  }, [sessionId, stopStreaming])

  useEffect(() => () => stopStreaming(), [stopStreaming])

  return {
    sessionId,
    messages,
    isStarting,
    isWaiting,
    pendingTool,
    error,
    hasSession: !!sessionId,
    isInChat: !!sessionId || !!pendingResumeId,
    startSession,
    resumeSession,
    listSessions,
    sendMessage,
    confirmTool,
    denyTool,
    endSession,
  }
}
