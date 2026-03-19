import { useEffect, useRef, useState, KeyboardEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  X,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Plus,
} from "lucide-react"
import { format as formatSQL } from "sql-formatter"
import { useAgentChat } from "@/hooks/use-agent-chat"
import { useOrganization } from "@/providers/organization-provider"
import { AgentMessage, PendingToolData } from "@/lib/agent-api"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// ─── Reasoning block ─────────────────────────────────────────────────────────

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
        <span className="font-medium">Reasoning</span>
        {open ? (
          <ChevronDown className="h-3 w-3 ml-auto" />
        ) : (
          <ChevronRight className="h-3 w-3 ml-auto" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="px-3 pb-3 text-xs text-muted-foreground italic leading-relaxed">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tool group ───────────────────────────────────────────────────────────────

function ToolGroup({ messages, isThinking }: { messages: AgentMessage[]; isThinking?: boolean }) {
  const [open, setOpen] = useState(isThinking ?? false)
  const count = messages.length

  // Use a Set to show unique tools if they are repeated consecutively, or just show them all
  // Here we'll show them all as steps
  const tools = messages.filter(m => !!m.tool_name)

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
                <div key={i} className="flex items-center gap-2 group/tool">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30 group-hover/tool:bg-primary/50 transition-colors" />
                  <span className="text-[11px] text-muted-foreground/50 group-hover/tool:text-muted-foreground/80 transition-colors font-mono">
                    {m.tool_name}
                  </span>
                  {m.role === "tool_result" && (
                    <CheckCircle className="h-2.5 w-2.5 text-green-500/40" />
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start"
      >
        <div className="flex-1 min-w-0">
          {message.reasoning && <ReasoningBlock text={message.reasoning} />}
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
                    return isBlock ? (
                      <pre className="my-2 rounded-lg bg-muted/50 border border-border/40 px-3 py-2.5 text-[11px] font-mono text-foreground/80 overflow-x-auto leading-relaxed whitespace-pre [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                        <code>{children}</code>
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
                {message.content}
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

function SessionsView({
  onNew,
  onResume,
  isStarting,
  listSessions,
}: {
  onNew: () => void
  onResume: (id: string) => void
  isStarting: boolean
  listSessions: () => Promise<StoredSession[]>
}) {
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSessions().then((s) => { setSessions(s); setLoading(false) })
  }, [listSessions])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <span className="text-sm font-medium text-foreground">Chats</span>
        <button
          onClick={onNew}
          disabled={isStarting}
          title="New conversation"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-1.5">
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground/50">Press + to start one</p>
          </div>
        ) : (
          <div className="py-1">
            {[...sessions].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((s) => (
              <button
                key={s.session_id}
                onClick={() => onResume(s.session_id)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-muted/40 transition-colors group"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                <span className="flex-1 min-w-0 text-sm text-foreground/80 truncate">
                  {stripMarkdown(s.session_summary) || "Conversation"}
                </span>
                <span className="text-[11px] text-muted-foreground/40 shrink-0">
                  {s.updated_at ? formatDate(s.updated_at) : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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

export function AgentChatPanel({ open, onClose }: AgentChatPanelProps) {
  const { selectedOrg, organizations } = useOrganization()
  const chat = useAgentChat(selectedOrg)
  const scrollRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef<number>(
    parseInt(localStorage.getItem("agent_panel_width") ?? String(DEFAULT_WIDTH))
  )
  const [panelWidth, setPanelWidth] = useState(widthRef.current)
  // "sessions" = list view, "chat" = active conversation
  const [view, setView] = useState<"sessions" | "chat">(chat.isInChat ? "chat" : "sessions")

  const org = organizations.find((o) => String(o.id) === selectedOrg)

  // Switch to chat view whenever sessionId changes to a new value
  useEffect(() => {
    if (chat.isInChat) setView("chat")
  }, [chat.isInChat])

  // Auto-scroll to bottom on new messages or loading state
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.isWaiting, chat.pendingTool])

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
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <div className="flex items-center gap-1">
              {view === "chat" && (
                <button
                  onClick={() => setView("sessions")}
                  title="Back to chats"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-sm font-medium text-foreground px-1">Agent</span>
            </div>
            <div className="flex items-center gap-0.5">
              {view === "chat" && chat.isInChat && (
                <button
                  onClick={() => { chat.endSession(); setView("sessions") }}
                  title="New conversation"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {view === "sessions" ? (
            <SessionsView
              onNew={() => { chat.startSession() }}
              onResume={(id) => { chat.resumeSession(id) }}
              isStarting={chat.isStarting}
              listSessions={chat.listSessions}
            />
          ) : (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
              >
                {(() => {
                  const isTool = (r: string) => r === "tool" || r === "tool_call" || r === "tool_result"
                  const msgs = chat.messages
                  const trailingToolsEnd = msgs.length > 0 && isTool(msgs[msgs.length - 1].role)
                  const groups: JSX.Element[] = []
                  let i = 0
                  while (i < msgs.length) {
                    if (isTool(msgs[i].role)) {
                      const toolMsgs: AgentMessage[] = []
                      const start = i
                      while (i < msgs.length && isTool(msgs[i].role)) {
                        toolMsgs.push(msgs[i++])
                      }
                      const isLast = i >= msgs.length
                      groups.push(
                        <ToolGroup
                          key={`tools-${start}`}
                          messages={toolMsgs}
                          isThinking={chat.isWaiting && isLast && trailingToolsEnd}
                        />
                      )
                    } else if (msgs[i].role === "user" || msgs[i].role === "assistant") {
                      groups.push(<MessageBubble key={i} message={msgs[i++]} />)
                    } else {
                      i++
                    }
                  }
                  return groups
                })()}

                {/* Standalone thinking — only when last message is not a tool */}
                <AnimatePresence>
                  {chat.isWaiting && (chat.messages.length === 0 || !["tool", "tool_call", "tool_result"].includes(chat.messages[chat.messages.length - 1].role)) && (
                    <ThinkingIndicator key="thinking" />
                  )}
                </AnimatePresence>

                {/* HITL */}
                <AnimatePresence>
                  {chat.pendingTool && (
                    <HITLCard
                      tool={chat.pendingTool}
                      onApprove={chat.confirmTool}
                      onDeny={chat.denyTool}
                    />
                  )}
                </AnimatePresence>

                {/* Error */}
                {chat.error && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
                    {chat.error}
                  </div>
                )}
              </div>

              {/* Input */}
              <ChatInput
                onSend={chat.sendMessage}
                disabled={!!chat.pendingTool}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
