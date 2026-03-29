import { useEffect, useRef, useState, useCallback, useMemo, KeyboardEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  X,
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Plus,
  Cable,
  MoreHorizontal,
} from "lucide-react"
import { format as formatSQL } from "sql-formatter"
import { useAgentChat } from "@/hooks/use-agent-chat"
import { useOrganization } from "@/providers/organization-provider"
import { AgentMessage, PendingToolData } from "@/lib/agent-api"
import { bridges as bridgesApi, spaces as spacesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQuery } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Tool group ───────────────────────────────────────────────────────────────

function ToolGroup({ messages, isThinking }: { messages: AgentMessage[]; isThinking?: boolean }) {
  const [open, setOpen] = useState(isThinking ?? false)

  const tools: AgentMessage[] = []
  let pendingReasoning: string | undefined

  for (const m of messages) {
    if (m.role === "reasoning" && m.content?.trim()) {
      pendingReasoning = m.content
      continue
    }

    if ((m.role === "tool" || m.role === "tool_call") && m.tool_name) {
      tools.push({
        ...m,
        reasoning: m.reasoning ?? pendingReasoning,
      })
      pendingReasoning = undefined
    }
  }

  const count = tools.length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs transition-colors group"
      >
        <span
          className={cn(
            "font-medium select-none",
            isThinking ? "text-muted-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"
          )}
          style={isThinking ? {
            backgroundImage: "linear-gradient(90deg, hsl(var(--muted-foreground)/0.4) 0%, hsl(var(--muted-foreground)/0.9) 40%, hsl(var(--muted-foreground)/0.4) 80%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 1.8s linear infinite",
          } : undefined}
        >
          {isThinking ? "Thinking..." : "Thinking"}
        </span>
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          [{count} {count === 1 ? "action" : "actions"}]
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform text-muted-foreground/30 group-hover:text-muted-foreground/60",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-2.5 space-y-1.5 border-l border-border/30 ml-1.5">
              {tools.map((m, i) => (
                <div key={i} className="space-y-1 group/tool">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30 group-hover/tool:bg-primary/50 transition-colors" />
                    <span className="text-[11px] text-muted-foreground/50 group-hover/tool:text-muted-foreground/80 transition-colors font-mono">
                      {m.tool_name}
                    </span>
                  </div>
                  {m.reasoning && (
                    <p className="pl-3 text-[11px] text-muted-foreground/55 leading-relaxed">
                      {m.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── HITL approval card ───────────────────────────────────────────────────────

function isSQLValue(key: string, value: unknown): boolean {
  return (
    typeof value === "string" &&
    (key.toLowerCase() === "sql" ||
      key.toLowerCase().includes("query") ||
      /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\b/i.test(value))
  )
}

function tryFormatSQL(sql: string): string {
  try {
    return formatSQL(sql, { language: "sql", tabWidth: 2, keywordCase: "upper" })
  } catch {
    return sql
  }
}

function extractCodeText(children: React.ReactNode): string {
  if (Array.isArray(children)) return children.map((c) => String(c)).join("")
  return String(children ?? "")
}

function ParamValue({ paramKey, value }: { paramKey: string; value: unknown }) {
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value)
  const isSQL = isSQLValue(paramKey, value)

  if (isSQL) {
    return (
      <pre className="w-full rounded-md bg-muted border border-border/40 px-3 py-2.5 text-[11px] font-mono text-foreground/75 whitespace-pre overflow-x-auto leading-relaxed no-scrollbar">
        {tryFormatSQL(raw)}
      </pre>
    )
  }

  return (
    <span className="text-xs text-foreground/70 font-mono">{raw}</span>
  )
}

function HITLCard({
  tool,
  onApprove,
  onDeny,
}: {
  tool: PendingToolData
  onApprove: () => void
  onDeny: () => void
}) {
  const params = tool.tool_args ?? tool.tool_input ?? {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60">
        <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Action requires approval</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The agent wants to run{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded-sm text-[11px] text-foreground/80">
              {tool.tool_name}
            </code>
          </p>
        </div>
      </div>

      {tool.reasoning && (
        <div className="px-4 py-3 border-b border-border/60">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50 mb-1.5">
            Reasoning
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{tool.reasoning}</p>
        </div>
      )}

      {/* Parameters */}
      {Object.keys(params).length > 0 && (
        <div className="px-4 py-3 border-b border-border/60 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            Parameters
          </p>
          {Object.entries(params).map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground mb-1.5">{k}</p>
              <ParamValue paramKey={k} value={v} />
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-medium text-white bg-[hsl(145,60%,28%)] hover:bg-[hsl(145,60%,32%)] transition-colors border-r border-border/60"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          onClick={onDeny}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-medium text-[hsl(0,65%,60%)] hover:bg-[hsl(0,65%,60%)]/5 transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          Deny
        </button>
      </div>
    </motion.div>
  )
}

// ─── Thinking indicator ───────────────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-1"
    >
      <span
        className="text-sm text-muted-foreground/40 select-none"
        style={{
          backgroundImage: "linear-gradient(90deg, hsl(var(--muted-foreground)/0.35) 0%, hsl(var(--muted-foreground)/0.9) 40%, hsl(var(--muted-foreground)/0.35) 80%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shimmer 1.8s linear infinite",
        }}
      >
        Thinking...
      </span>
    </motion.div>
  )
}

// ─── Single message ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-muted dark:bg-[hsl(0,0%,12%)] px-3.5 py-2.5 text-sm text-foreground leading-relaxed">
          {message.content}
        </div>
      </motion.div>
    )
  }

  if (message.role === "assistant") {
    const msgLanguage = ((message as AgentMessage & { language?: string }).language || "").toLowerCase()
    const hasExplicitLanguage = !!msgLanguage
    const assistantContent = hasExplicitLanguage
      ? `\`\`\`${msgLanguage}\n${message.content ?? ""}\n\`\`\``
      : (message.content ?? "")

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start"
      >
        <div className="flex-1 min-w-0">
          {message.content && (
            <div className="text-sm text-foreground leading-relaxed mt-1 agent-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="my-3 w-full rounded-lg border border-border/50 overflow-hidden">
                      <table className="w-full table-fixed text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/60">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-semibold text-foreground/80 border-b border-border/50 whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-foreground/70 border-b border-border/30 last:border-0 font-mono text-[11px]">
                      {children}
                    </td>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-")
                    const language = className?.replace("language-", "").toLowerCase()
                    const raw = extractCodeText(children)
                    const rendered = language === "sql" ? tryFormatSQL(raw) : raw
                    return isBlock ? (
                      <pre className="my-2 rounded-lg bg-muted/50 border border-border/40 px-3 py-2.5 text-[11px] font-mono text-foreground/80 overflow-x-auto leading-relaxed whitespace-pre [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                        <code>{rendered}</code>
                      </pre>
                    ) : (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground/80">
                        {children}
                      </code>
                    )
                  },
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-foreground/80">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                }}
              >
                {assistantContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return null
}

// ─── Sessions list ────────────────────────────────────────────────────────────

import { StoredSession } from "@/lib/agent-api"

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function stripMarkdown(text: string) {
  return text.replace(/\*\*|__|##|#|\*/g, "").trim()
}

const SESSIONS_PREVIEW = 5

// ─── Input area ───────────────────────────────────────────────────────────────

function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled: boolean
}) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div className="border-t border-border/50 p-3">
      <div className="relative rounded-xl border border-border/70 bg-card/60 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask the agent anything…"
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-3.5 pt-3 pb-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-40"
          style={{ minHeight: 44 }}
        />
        <div className="absolute bottom-2 right-2">
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
              value.trim() && !disabled
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "bg-muted text-muted-foreground/40"
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const DEFAULT_WIDTH = 380
const MIN_WIDTH = 260
const MAX_WIDTH = 720

interface AgentChatPanelProps {
  open: boolean
  onClose: () => void
}

function spaceListKey(s: { id: string; space_id?: string }): string {
  return String(s.space_id ?? s.id)
}

function spaceDisplayName(s: { name: string; space_name?: string }): string {
  return String(s.name ?? s.space_name ?? "").trim()
}

export function AgentChatPanel({ open, onClose }: AgentChatPanelProps) {
  const { selectedOrg } = useOrganization()
  const [selectedBridge, setSelectedBridge] = useState<string>("")
  /** Internal list key (id); API start uses resolved display name only, never this value. */
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<string>("__none__")
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const { data: orgBridges } = useQuery({
    queryKey: ["organizations", selectedOrg, "bridges"],
    queryFn: () => bridgesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  })
  const sqlBridges = (orgBridges?.items ?? []).filter(b =>
    ["postgresql", "timescaledb", "supabase"].includes(b.type?.toLowerCase() || "")
  )

  const { data: orgSpaces } = useQuery({
    queryKey: ["organizations", selectedOrg, "spaces"],
    queryFn: () => spacesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  })
  const availableSpaces = orgSpaces?.items ?? []

  useEffect(() => {
    setSelectedSpaceKey("__none__")
  }, [selectedOrg])

  const selectedSpaceNameForApi = useMemo(() => {
    if (selectedSpaceKey === "__none__") return undefined
    const sp = availableSpaces.find((s) => spaceListKey(s) === String(selectedSpaceKey))
    const n = sp ? spaceDisplayName(sp) : ""
    return n || undefined
  }, [availableSpaces, selectedSpaceKey])

  const chat = useAgentChat(
    selectedOrg,
    "user",
    selectedBridge || undefined,
    selectedSpaceNameForApi
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef<number>(
    parseInt(localStorage.getItem("agent_panel_width") ?? String(DEFAULT_WIDTH))
  )
  const [panelWidth, setPanelWidth] = useState(widthRef.current)

  const loadSessions = useCallback(async () => {
    const s = await chat.listSessions()
    setSessions([...s].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
  }, [chat.listSessions])

  // Load sessions when panel opens
  useEffect(() => {
    if (open) loadSessions()
  }, [open, loadSessions])

  // Track active session from chat hook
  useEffect(() => {
    if (chat.sessionId) setActiveSessionId(chat.sessionId)
  }, [chat.sessionId])

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.isWaiting, chat.pendingTool])

  const handleNew = useCallback(() => {
    chat.endSession()
    setActiveSessionId(null)
    loadSessions()
  }, [chat.endSession, loadSessions])

  const handleResume = useCallback((id: string) => {
    setActiveSessionId(id)
    chat.resumeSession(id)
  }, [chat.resumeSession])

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, SESSIONS_PREVIEW)
  const hasMore = sessions.length > SESSIONS_PREVIEW

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthRef.current
    const onMove = (e: MouseEvent) => {
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth - (e.clientX - startX)))
      widthRef.current = next
      setPanelWidth(next)
    }
    const onUp = () => {
      localStorage.setItem("agent_panel_width", String(widthRef.current))
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative flex h-full shrink-0 flex-col border-l border-border/50 bg-background"
          style={{ minWidth: 0 }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={startResize}
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 shrink-0">
            <div className="flex items-center gap-1">
              {chat.isInChat && (
                <button
                  onClick={handleNew}
                  title="Back to chats"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-sm font-medium text-foreground px-1">Agent</span>
            </div>
            <div className="flex items-center gap-1.5">
              {availableSpaces.length > 0 && (
                <Select value={selectedSpaceKey} onValueChange={setSelectedSpaceKey}>
                  <SelectTrigger className="h-6 text-[11px] border-border/50 bg-muted/40 gap-1 px-2 w-auto max-w-[140px]">
                    <SelectValue placeholder="Space..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">
                      No space
                    </SelectItem>
                    {availableSpaces.map((space) => (
                      <SelectItem key={spaceListKey(space)} value={spaceListKey(space)} className="text-xs">
                        {spaceDisplayName(space) || spaceListKey(space)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {sqlBridges.length > 0 && (
                <Select value={selectedBridge} onValueChange={setSelectedBridge}>
                  <SelectTrigger className="h-6 text-[11px] border-border/50 bg-muted/40 gap-1 px-2 w-auto max-w-[130px]">
                    <Cable className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <SelectValue placeholder="Bridge..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sqlBridges.map((b) => (
                      <SelectItem key={b.id} value={b.name} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Sessions list — only shown when no active chat */}
          {!chat.isInChat && <div className="shrink-0 border-b border-border/40">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">Chats</span>
              <button
                onClick={handleNew}
                disabled={chat.isStarting}
                title="New conversation"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {chat.isStarting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-muted-foreground/50">No conversations yet</p>
            ) : (
              <div className="pb-1">
                {visibleSessions.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => handleResume(s.session_id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-4 py-1.5 text-left transition-colors group",
                      activeSessionId === s.session_id
                        ? "bg-muted/60 text-foreground"
                        : "hover:bg-muted/30 text-foreground/70"
                    )}
                  >
                    <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    <span className="flex-1 min-w-0 text-xs truncate">
                      {chat.getSessionTitles()[s.session_id] || stripMarkdown(s.session_summary) || "Conversation"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">
                      {s.updated_at ? formatDate(s.updated_at) : ""}
                    </span>
                  </button>
                ))}
                {hasMore && (
                  <button
                    onClick={() => setShowAllSessions((v) => !v)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                    {showAllSessions ? "Show less" : `${sessions.length - SESSIONS_PREVIEW} more`}
                  </button>
                )}
              </div>
            )}
          </div>}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
          >
            {chat.isInChat ? (
              <>
                {(() => {
                  const isTool = (r: string) => r === "tool" || r === "tool_call" || r === "tool_result" || r === "reasoning"
                  const isEmpty = (m: AgentMessage) => !m.content?.trim() && !m.reasoning
                  const msgs = chat.messages
                  const lastRole = msgs.length > 0 ? msgs[msgs.length - 1].role : ""
                  const trailingToolsEnd = isTool(lastRole) || (lastRole === "assistant" && isEmpty(msgs[msgs.length - 1]))
                  const groups: JSX.Element[] = []
                  let i = 0
                  while (i < msgs.length) {
                    if (isTool(msgs[i].role)) {
                      const toolMsgs: AgentMessage[] = []
                      const start = i
                      while (i < msgs.length) {
                        if (isTool(msgs[i].role)) {
                          toolMsgs.push(msgs[i++])
                        } else if (msgs[i].role === "assistant" && isEmpty(msgs[i])) {
                          i++
                        } else {
                          break
                        }
                      }
                      const isLast = i >= msgs.length
                      groups.push(
                        <ToolGroup
                          key={`tools-${start}`}
                          messages={toolMsgs}
                          isThinking={chat.isWaiting && isLast && trailingToolsEnd}
                        />
                      )
                    } else if (msgs[i].role === "assistant" && isEmpty(msgs[i])) {
                      i++
                    } else if (msgs[i].role === "user" || msgs[i].role === "assistant") {
                      groups.push(<MessageBubble key={i} message={msgs[i++]} />)
                    } else {
                      i++
                    }
                  }
                  return groups
                })()}

                <AnimatePresence>
                  {chat.isWaiting && (chat.messages.length === 0 || !["tool", "tool_call", "tool_result", "reasoning"].includes(chat.messages[chat.messages.length - 1].role)) && (
                    <ThinkingIndicator key="thinking" />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {chat.pendingTool && (
                    <HITLCard
                      tool={chat.pendingTool}
                      onApprove={chat.confirmTool}
                      onDeny={chat.denyTool}
                    />
                  )}
                </AnimatePresence>

                {chat.error && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
                    {chat.error}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground/50">Select a chat or start a new one</p>
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput
            onSend={chat.sendMessage}
            disabled={!!chat.pendingTool}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
