"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, MessagesSquare, MoreHorizontal, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { KbDot } from "@/components/knowledge/kb-dot"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, relative } from "@/lib/format"
import type { Thread } from "@/lib/mock/types"
import { MessageView } from "./message"
import { threadMarkdown, visibleThreads } from "./chat-data"

const channelLabel: Record<Thread["channel"], string> = { app: "App", api: "API", mcp: "MCP", public: "Public link" }
const kindLabel: Record<Thread["startedBy"]["kind"], string> = { member: "Member", api_key: "API key", mcp: "MCP client" }

export function ConversationsTable() {
  const state = usePageState()
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const role = useMock((s) => s.role)
  const user = useMock((s) => s.user)
  const allThreads = useMock((s) => s.threads)
  const kbs = useMock((s) => s.kbs)
  const deleteThread = useMock((s) => s.deleteThread)
  const [open, setOpen] = useState<Thread | null>(null)
  const [deleting, setDeleting] = useState<Thread[] | null>(null)

  const threads = useMemo(() => (state === "empty" ? [] : visibleThreads(allThreads, user.id, role)), [state, allThreads, user.id, role])
  const kbName = (id: string) => kbs.find((k) => k.id === id)
  const exportMd = (t: Thread) => toast.success("Exported as Markdown", { description: `${t.title}.md · ${num(threadMarkdown(t).length)} characters` })
  const own = (t: Thread) => t.ownerId === user.id && t.channel === "app"

  const columns = useMemo<ColumnDef<Thread>[]>(() => {
    const cols: ColumnDef<Thread>[] = [
      {
        accessorKey: "title",
        header: ({ column }) => <SortHeader column={column} title="Title" />,
        cell: ({ row }) => <span className="block max-w-[280px] truncate font-medium">{row.original.title}</span>,
        // Search covers the title and every message, the in-app stand-in for full-text search.
        filterFn: (row, _id, value: string) => {
          const q = value.toLowerCase()
          return row.original.title.toLowerCase().includes(q) || row.original.messages.some((m) => m.content.toLowerCase().includes(q))
        },
      },
      {
        id: "member",
        accessorFn: (r) => r.startedBy.name,
        header: "Started by",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">{kindLabel[row.original.startedBy.kind]}</Badge>
            <span className="truncate">{row.original.startedBy.name}</span>
          </div>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "channel",
        header: "Channel",
        cell: ({ row }) => <Badge variant="secondary" className="font-normal">{channelLabel[row.original.channel]}</Badge>,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      { id: "messages", accessorFn: (r) => r.messages.length, header: ({ column }) => <SortHeader column={column} title="Messages" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.messages.length) },
      {
        id: "kbs",
        accessorFn: (r) => r.kbIds,
        header: "Knowledge bases",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex max-w-[260px] flex-wrap gap-x-3 gap-y-1">
            {row.original.kbIds.map((id) => {
              const k = kbName(id)
              return k ? (
                <span key={id} className="inline-flex items-center gap-1.5 text-xs">
                  <KbDot color={k.color} className="size-2" /> {k.name}
                </span>
              ) : null
            })}
          </div>
        ),
        filterFn: (row, id, value: string[]) => (row.getValue(id) as string[]).some((v) => value.includes(v)),
      },
      { id: "last", accessorFn: (r) => r.lastMessageAt, header: ({ column }) => <SortHeader column={column} title="Last message" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.lastMessageAt)}</span> },
      {
        id: "feedback",
        accessorFn: (r) => (r.feedback.down > 0 ? "negative" : "none"),
        header: "Feedback",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ThumbsUp className="size-3" /> {row.original.feedback.up}</span>
            <span className={row.original.feedback.down ? "inline-flex items-center gap-1 text-destructive" : "inline-flex items-center gap-1"}><ThumbsDown className="size-3" /> {row.original.feedback.down}</span>
          </span>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpen(row.original)}>Open</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMd(row.original)}><Download className="size-4" /> Export as Markdown</DropdownMenuItem>
                {(admin || row.original.ownerId === user.id) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting([row.original])}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ]
    if (admin) cols.unshift(selectColumn<Thread>())
    return cols
  }, [admin, kbs, user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const members = Array.from(new Set(threads.map((t) => t.startedBy.name))).sort()
  const filters = [
    ...(admin ? [{ column: "channel", title: "Channel", options: (["app", "api", "mcp", "public"] as const).map((c) => ({ label: channelLabel[c], value: c })) }] : []),
    ...(admin ? [{ column: "member", title: "Started by", options: members.map((m) => ({ label: m, value: m })) }] : []),
    { column: "kbs", title: "Knowledge base", options: kbs.map((k) => ({ label: k.name, value: k.id })) },
    { column: "feedback", title: "Feedback", options: [{ label: "Has negative feedback", value: "negative" }, { label: "No negative feedback", value: "none" }] },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Conversations"
        description={admin ? "Every conversation in the workspace, from the app, the API, MCP clients and public links." : "Your conversations with the workspace assistant."}
        actions={
          <Button size="sm" onClick={() => router.push(`${base}/chat`)}>
            <MessagesSquare className="size-4" /> Open chat
          </Button>
        }
      />
      <PageStateGate state={state}>
        <DataTable
          columns={columns}
          data={threads}
          getRowId={(r) => r.id}
          searchColumn="title"
          searchPlaceholder="Search titles and messages…"
          filters={filters}
          initialSorting={[{ id: "last", desc: true }]}
          onRowClick={(r) => setOpen(r)}
          bulkActions={admin ? [{ label: "Delete", icon: Trash2, variant: "destructive", onClick: (rows) => setDeleting(rows) }] : []}
          emptyState={
            <div className="rounded-lg border">
              <EmptyState
                icon={MessagesSquare}
                title="No conversations yet"
                description="A conversation is a thread of questions and cited answers with the workspace assistant, started in the app or by an AI client over MCP or the API."
                action={{ label: "Open chat", href: `${base}/chat` }}
              />
            </div>
          }
        />
      </PageStateGate>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
          {open && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="pr-6">{open.title}</SheetTitle>
                <SheetDescription>
                  {kindLabel[open.startedBy.kind]} {open.startedBy.name} · {channelLabel[open.channel]} · {open.messages.length} messages · {relative(open.lastMessageAt)}
                </SheetDescription>
                <div className="flex flex-wrap gap-2 pt-1">
                  {own(open) && (
                    <Button asChild size="sm"><Link href={`${base}/chat/${open.id}`}>Open in chat</Link></Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => exportMd(open)}><Download className="size-4" /> Export as Markdown</Button>
                </div>
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
                <div className="flex flex-col gap-5 p-4">
                  {open.messages.map((m) => <MessageView key={m.id} message={m} thread={open} readOnly />)}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting && deleting.length > 1 ? `Delete ${deleting.length} conversations?` : `Delete "${deleting?.[0]?.title}"?`}
        description="The messages are removed for everyone. Feedback already counted in analytics is kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return
          deleting.forEach((t) => deleteThread(t.id))
          toast.success(deleting.length > 1 ? `Deleted ${deleting.length} conversations` : "Conversation deleted")
          if (open && deleting.some((t) => t.id === open.id)) setOpen(null)
          setDeleting(null)
        }}
      />
    </div>
  )
}
