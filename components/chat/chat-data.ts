"use client"

import { create } from "zustand"
import { useMock } from "@/lib/mock/store"
import { findChatReply } from "@/lib/mock/answer"
import type { ChatMessage, KnowledgeBase, Source, Item, Thread, User, Role } from "@/lib/mock/types"

/** The knowledge base a cited document belongs to, preferring one the thread queried. */
export function kbForDocument(documentId: string, items: Item[], sources: Source[], kbs: KnowledgeBase[], preferIds: string[] = []): KnowledgeBase | undefined {
  const item = items.find((i) => i.id === documentId)
  const src = item ? sources.find((s) => s.id === item.sourceId) : undefined
  const ids = src?.usedByKbIds ?? []
  const pick = ids.find((id) => preferIds.includes(id) && id !== "kb_all") ?? ids.find((id) => id !== "kb_all") ?? ids[0] ?? preferIds[0]
  return kbs.find((k) => k.id === pick)
}

/** Knowledge bases a member may query from chat. Admins can query every one. */
export function queryableKbs(kbs: KnowledgeBase[], user: User, admin: boolean) {
  if (admin) return kbs
  return kbs.filter((k) => k.access.members.mode === "all" || k.access.members.principals.some((p) => p === user.email || p === user.name || p === user.id))
}

export function visibleThreads(threads: Thread[], userId: string, role: Role) {
  const admin = role === "owner" || role === "admin"
  return threads.filter((t) => admin || t.ownerId === userId)
}

export function dayGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(iso)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= start) return "Today"
  if (d.getTime() >= start - 86400_000) return "Yesterday"
  return "Earlier"
}

export function distinctCitedDocs(thread?: Thread) {
  if (!thread) return 0
  return new Set(thread.messages.flatMap((m) => m.citations?.map((c) => c.documentId) ?? [])).size
}

export const mid = () => `m_${Math.random().toString(36).slice(2, 10)}`

type PendingTool = NonNullable<ChatMessage["toolCall"]>

interface StreamState {
  threadId?: string
  messageId?: string
  phase?: "thinking" | "tool" | "text"
  pendingTool?: PendingTool
  /** Messages whose stream failed part-way; they keep their partial text and show Retry. */
  errored: Record<string, boolean>
  /** Display-only truncation for the ?state=error demo, so stored answers stay whole. */
  truncated: Record<string, boolean>
}

// Lives outside React so a stream survives the route change from /chat to /chat/{id}.
export const useStream = create<StreamState>(() => ({ errored: {}, truncated: {} }))

let timer: ReturnType<typeof setInterval> | undefined
let toolTimer: ReturnType<typeof setTimeout> | undefined

export function stopStream() {
  if (timer) clearInterval(timer)
  if (toolTimer) clearTimeout(toolTimer)
  timer = undefined
  toolTimer = undefined
  useStream.setState({ threadId: undefined, messageId: undefined, phase: undefined, pendingTool: undefined })
}

/**
 * Stream a canned reply into an assistant message, 2 characters every 20 ms. Replies with a tool
 * call show the tool card running for 800 ms first. `failPart` stops at half and marks the message errored.
 */
export function streamReply(threadId: string, question: string, opts: { messageId?: string; failPart?: boolean } = {}) {
  stopStream()
  const store = useMock.getState()
  const thread = store.threads.find((t) => t.id === threadId)
  const reply = findChatReply(question)
  const kb = store.kbs.find((k) => k.id === thread?.kbIds.find((id) => id !== "kb_all")) ?? store.kbs.find((k) => k.id === thread?.kbIds[0])
  const text = reply.noAnswer || !reply.content ? kb?.retrieval.noAnswerMessage ?? "I could not find that in the knowledge base." : reply.content
  const noAnswer = !!reply.noAnswer || !reply.content
  const id = opts.messageId ?? mid()
  if (opts.messageId) store.updateMessage(threadId, id, { content: "", citations: undefined, toolCall: undefined, noAnswer: undefined, feedback: undefined, structured: undefined })
  else store.appendMessage(threadId, { id, role: "assistant", content: "", at: new Date().toISOString() })
  useStream.setState((s) => ({ threadId, messageId: id, phase: "thinking", errored: { ...s.errored, [id]: false }, truncated: { ...s.truncated, [id]: false } }))

  const startText = () => {
    useStream.setState({ phase: "text", pendingTool: undefined })
    let i = 0
    const stopAt = opts.failPart ? Math.floor(text.length / 2) : text.length
    timer = setInterval(() => {
      i = Math.min(stopAt, i + 2)
      useMock.getState().updateMessage(threadId, id, { content: text.slice(0, i) })
      if (i >= stopAt) {
        if (timer) clearInterval(timer)
        timer = undefined
        if (opts.failPart) {
          useStream.setState((s) => ({ threadId: undefined, messageId: undefined, phase: undefined, errored: { ...s.errored, [id]: true } }))
          return
        }
        useMock.getState().updateMessage(threadId, id, { citations: reply.citations, noAnswer, at: new Date().toISOString() })
        useStream.setState({ threadId: undefined, messageId: undefined, phase: undefined })
      }
    }, 20)
  }

  toolTimer = setTimeout(() => {
    if (reply.toolCall && thread?.toolsEnabled !== false) {
      useStream.setState({ phase: "tool", pendingTool: reply.toolCall })
      toolTimer = setTimeout(() => {
        useMock.getState().updateMessage(threadId, id, { toolCall: reply.toolCall })
        startText()
      }, 800)
    } else startText()
  }, 500)
  return id
}

/** Ends a stream early: the text so far stays as the answer. */
export function stopAndKeep() {
  const { threadId, messageId, pendingTool } = useStream.getState()
  if (threadId && messageId && pendingTool) useMock.getState().updateMessage(threadId, messageId, { toolCall: { ...pendingTool, status: "failed" } })
  stopStream()
}

export function threadMarkdown(t: Thread) {
  return [`# ${t.title}`, "", ...t.messages.map((m) => `**${m.role === "user" ? t.startedBy.name : "Assistant"}:** ${m.content}`)].join("\n\n")
}
