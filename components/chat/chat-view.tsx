"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileSearch, MessageSquareDashed, MessagesSquare, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CopyableField } from "@/components/shared/copy"
import { EmptyState } from "@/components/shared/states"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { useRole } from "@/hooks/use-role"
import { usePageState } from "@/hooks/use-page-state"
import { suggestedQuestions } from "@/lib/mock/seed"
import { ThreadRail } from "./thread-rail"
import { MessageView } from "./message"
import { Composer, KbChip } from "./composer"
import { distinctCitedDocs, mid, queryableKbs, stopAndKeep, streamReply, useStream } from "./chat-data"

export function ChatView({ threadId }: { threadId?: string }) {
  const router = useRouter()
  const state = usePageState()
  const { base } = useWs()
  const { admin } = useRole()
  const user = useMock((s) => s.user)
  const allKbs = useMock((s) => s.kbs)
  const settings = useMock((s) => s.settings)
  const thread = useMock((s) => (threadId ? s.threads.find((t) => t.id === threadId) : undefined))
  const createThread = useMock((s) => s.createThread)
  const appendMessage = useMock((s) => s.appendMessage)
  const renameThread = useMock((s) => s.renameThread)
  const stream = useStream()
  const [railOpen, setRailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const failNext = useRef(state === "error")
  const bottomRef = useRef<HTMLDivElement>(null)

  const kbs = useMemo(() => (state === "empty" ? [] : queryableKbs(allKbs, user, admin)), [state, allKbs, user, admin])
  const defaultKbIds = useMemo(() => {
    const d = settings.chat.defaultKbs
    if (d === "all") return kbs.map((k) => k.id)
    if (d === "none") return []
    return d.filter((id) => kbs.some((k) => k.id === id))
  }, [settings.chat.defaultKbs, kbs])
  const [kbIds, setKbIds] = useState<string[]>(thread?.kbIds ?? defaultKbIds)
  const [tools, setTools] = useState<boolean>(thread?.toolsEnabled ?? settings.chat.toolsByDefault)
  useEffect(() => {
    setKbIds(thread?.kbIds ?? defaultKbIds)
    setTools(thread?.toolsEnabled ?? settings.chat.toolsByDefault)
  }, [threadId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ?state=error: the last answer in the thread shows as a partial with Retry.
  useEffect(() => {
    if (state !== "error" || !thread) return
    const last = [...thread.messages].reverse().find((m) => m.role === "assistant")
    if (last && !useStream.getState().errored[last.id]) {
      useStream.setState((s) => ({ errored: { ...s.errored, [last.id]: true }, truncated: { ...s.truncated, [last.id]: true } }))
      failNext.current = false
    }
  }, [state, thread?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const msgCount = thread?.messages.length ?? 0
  const lastLen = thread?.messages[msgCount - 1]?.content.length ?? 0
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [msgCount, lastLen, stream.phase])

  const streamingHere = !!stream.messageId && stream.threadId === thread?.id

  const send = (text: string) => {
    let id = thread?.id
    if (!id) id = createThread({ kbIds, toolsEnabled: tools }).id
    appendMessage(id, { id: mid(), role: "user", content: text, at: new Date().toISOString() })
    const fail = failNext.current
    failNext.current = false
    streamReply(id, text, { failPart: fail })
    if (!thread) router.push(`${base}/chat/${id}`)
  }

  const regenerate = (messageId: string) => {
    if (!thread) return
    const idx = thread.messages.findIndex((m) => m.id === messageId)
    const q = [...thread.messages.slice(0, idx)].reverse().find((m) => m.role === "user")
    if (q) streamReply(thread.id, q.content, { messageId })
  }

  const suggestions = suggestedQuestions.kb_all ?? []
  const notFound = !!threadId && !thread

  const rail = <ThreadRail activeId={threadId} className="h-full w-full min-w-0" onNavigate={() => setRailOpen(false)} />

  return (
    <div className="flex h-[calc(100svh-var(--header-height)-2rem)] min-h-[480px] overflow-hidden rounded-lg border bg-card md:h-[calc(100svh-var(--header-height)-4rem)]">
      <aside className="hidden w-[260px] shrink-0 overflow-hidden border-r lg:flex">{rail}</aside>
      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" className="w-full p-0 sm:max-w-[300px]">
          <SheetHeader className="border-b"><SheetTitle>Conversations</SheetTitle></SheetHeader>
          <div className="min-h-0 flex-1">{rail}</div>
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-12 flex-wrap items-center gap-2 border-b px-3 py-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setRailOpen(true)}>
            <MessagesSquare className="size-4" /> <span className="sr-only sm:not-sr-only">Conversations</span>
          </Button>
          <div className="min-w-0 flex-1">
            {thread && editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => { if (titleDraft.trim()) renameThread(thread.id, titleDraft.trim()); setEditingTitle(false) }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false) }}
                className="h-8 max-w-md"
                aria-label="Conversation title"
              />
            ) : thread ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="max-w-full truncate rounded px-1 text-left text-sm font-semibold hover:bg-accent" onClick={() => { setTitleDraft(thread.title); setEditingTitle(true) }}>
                    {thread.title}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to rename</TooltipContent>
              </Tooltip>
            ) : (
              <span className="px-1 text-sm font-semibold">{notFound ? "Conversation not found" : "New conversation"}</span>
            )}
          </div>
          {thread && (
            <>
              <Badge variant="outline" className="gap-1 font-normal">
                <FileSearch className="size-3" /> {distinctCitedDocs(thread)}<span className="hidden sm:inline"> {distinctCitedDocs(thread) === 1 ? "source" : "sources"} used</span>
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="size-4" /> <span className="sr-only sm:not-sr-only">Share</span>
              </Button>
            </>
          )}
        </header>

        {state === "loading" ? (
          <div className="flex-1 space-y-4 p-4">
            <Skeleton className="ml-auto h-10 w-2/3 max-w-md" />
            <Skeleton className="h-20 w-full max-w-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 max-w-sm" />
            <Skeleton className="h-16 w-full max-w-2xl" />
          </div>
        ) : notFound ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={MessageSquareDashed}
              title="This conversation does not exist"
              description="It may have been deleted, or it belongs to someone else. Pick another conversation from the list or start a new one."
              action={{ label: "New conversation", href: `${base}/chat` }}
              secondaryAction={{ label: "All conversations", href: `${base}/chat/conversations` }}
            />
          </div>
        ) : !thread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-8 text-center">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Ask the workspace</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {settings.chat.assistantName} answers from the knowledge bases you pick below and cites the documents it used.
              </p>
            </div>
            {kbs.length > 0 && (
              <>
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-left font-normal" onClick={() => send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
                <KbChip kbs={kbs} value={kbIds} onChange={setKbIds} />
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
            <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5">
              {thread.messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Ask something below.</p>}
              {thread.messages.map((m) => {
                const active = streamingHere && stream.messageId === m.id
                return (
                  <MessageView
                    key={m.id}
                    message={stream.truncated[m.id] ? { ...m, content: m.content.slice(0, Math.floor(m.content.length / 2)), citations: undefined } : m}
                    thread={thread}
                    streaming={active && stream.phase === "text"}
                    thinking={active && (stream.phase === "thinking" || stream.phase === "tool")}
                    pendingTool={active ? stream.pendingTool : undefined}
                    errored={!!stream.errored[m.id]}
                    onRegenerate={() => regenerate(m.id)}
                  />
                )
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}

        {!notFound && (
          <div className="mx-auto w-full max-w-3xl p-3">
            <Composer kbs={kbs} kbIds={kbIds} onKbIds={setKbIds} tools={tools} onTools={setTools} onSend={send} streaming={streamingHere} onStop={stopAndKeep} noKb={kbs.length === 0} />
            {kbs.length > 0 && <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground sm:block">Enter to send, Shift+Enter for a new line. Answers can be wrong; check the cited documents.</p>}
          </div>
        )}
      </section>

      {thread && (
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share this conversation</DialogTitle>
              <DialogDescription>Anyone who is a member of this workspace can open the link read-only. People outside the workspace cannot.</DialogDescription>
            </DialogHeader>
            <CopyableField label="Workspace link" value={`${typeof window !== "undefined" ? window.location.origin : ""}${base}/chat/${thread.id}`} />
            {admin && (
              <p className="text-xs text-muted-foreground">
                To answer people outside the workspace, turn on a public link on the knowledge base&apos;s <Link href={`${base}/kb/${thread.kbIds[0] ?? "kb_all"}/access`} className="underline underline-offset-4">Access</Link> page.
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
