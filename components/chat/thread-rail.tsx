"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { History, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { cn } from "@/lib/utils"
import { relative } from "@/lib/format"
import type { Thread } from "@/lib/mock/types"
import { dayGroup, visibleThreads } from "./chat-data"

export function ThreadRail({ activeId, onNavigate, className }: { activeId?: string; onNavigate?: () => void; className?: string }) {
  const router = useRouter()
  const { base } = useWs()
  const threads = useMock((s) => s.threads)
  const user = useMock((s) => s.user)
  const role = useMock((s) => s.role)
  const renameThread = useMock((s) => s.renameThread)
  const deleteThread = useMock((s) => s.deleteThread)
  const [q, setQ] = useState("")
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [deleting, setDeleting] = useState<Thread | null>(null)

  const groups = useMemo(() => {
    const list = visibleThreads(threads, user.id, role)
      .filter((t) => t.channel === "app")
      .filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()) || t.messages.some((m) => m.content.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    const out: Record<string, Thread[]> = { Today: [], Yesterday: [], Earlier: [] }
    list.forEach((t) => out[dayGroup(t.lastMessageAt)].push(t))
    return out
  }, [threads, user.id, role, q])
  const total = groups.Today.length + groups.Yesterday.length + groups.Earlier.length

  const commitRename = (id: string) => {
    if (draft.trim()) renameThread(id, draft.trim())
    setRenaming(null)
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="space-y-2 border-b p-3">
        <Button className="w-full justify-start" size="sm" onClick={() => { onNavigate?.(); router.push(`${base}/chat`) }}>
          <Plus className="size-4" /> New conversation
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" className="h-8 pl-8" aria-label="Search conversations" />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-3 p-2">
          {total === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">{q ? "No conversations match." : "No conversations yet. Ask something to start one."}</p>}
          {(["Today", "Yesterday", "Earlier"] as const).map((g) =>
            groups[g].length ? (
              <div key={g}>
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{g}</p>
                <ul className="space-y-0.5">
                  {groups[g].map((t) => (
                    <li key={t.id} className={cn("group/item flex items-center gap-1 rounded-md pr-1 hover:bg-accent", t.id === activeId && "bg-accent")}>
                      {renaming === t.id ? (
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitRename(t.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitRename(t.id); if (e.key === "Escape") setRenaming(null) }}
                          className="h-7 text-sm"
                          aria-label="Conversation title"
                        />
                      ) : (
                        <Link href={`${base}/chat/${t.id}`} onClick={onNavigate} className="min-w-0 flex-1 px-2 py-1.5">
                          <span className="block truncate text-sm">{t.title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{relative(t.lastMessageAt)}{t.ownerId !== user.id ? ` · ${t.startedBy.name}` : ""}</span>
                        </Link>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 data-[state=open]:opacity-100" aria-label={`Actions for ${t.title}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setDraft(t.title); setRenaming(t.id) }}><Pencil className="size-4" /> Rename</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(t)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-2">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          <Link href={`${base}/chat/conversations`} onClick={onNavigate}><History className="size-4" /> All conversations</Link>
        </Button>
      </div>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="The conversation and its messages are removed for everyone. Feedback already counted in analytics is kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return
          deleteThread(deleting.id)
          toast.success("Conversation deleted")
          if (deleting.id === activeId) router.push(`${base}/chat`)
          setDeleting(null)
        }}
      />
    </div>
  )
}
