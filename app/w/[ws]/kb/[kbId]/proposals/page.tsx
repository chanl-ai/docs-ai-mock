"use client"

import { Suspense, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { FileCheck2, Check, X, Bot, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable, selectColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { bytes, relative } from "@/lib/format"
import type { Proposal } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

function Diff({ before, after }: { before: string; after: string }) {
  const b = before.split("\n")
  const a = after.split("\n")
  const removed = b.filter((l) => !a.includes(l))
  const added = a.filter((l) => !b.includes(l))
  const same = a.filter((l) => b.includes(l))
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <pre className="max-h-72 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
        {b.length === 1 && !b[0] ? <span className="text-muted-foreground">(new document)</span> : b.map((l, i) => <div key={i} className={cn(removed.includes(l) && "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200")}>{removed.includes(l) ? "- " : "  "}{l}</div>)}
      </pre>
      <pre className="max-h-72 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
        {a.map((l, i) => <div key={i} className={cn(added.includes(l) && "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200")}>{added.includes(l) ? "+ " : "  "}{l}</div>)}
      </pre>
      <p className="col-span-full text-[11px] text-muted-foreground">{same.length} unchanged · {added.length} added · {removed.length} removed lines</p>
    </div>
  )
}

function ProposalsInner() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const all = useMock((s) => s.proposals.filter((p) => p.kbId === kb.id))
  const approve = useMock((s) => s.approveProposal)
  const reject = useMock((s) => s.rejectProposal)
  const updateKb = useMock((s) => s.updateKb)
  const status = (search.get("status") as Proposal["status"]) || "pending"
  const [open, setOpen] = useState<Proposal | null>(null)
  const [comment, setComment] = useState("")

  const data = useMemo(() => (state === "empty" ? [] : all.filter((p) => p.status === status)), [all, status, state])
  const counts = { pending: all.filter((p) => p.status === "pending").length, approved: all.filter((p) => p.status === "approved").length, rejected: all.filter((p) => p.status === "rejected").length }

  const columns = useMemo<ColumnDef<Proposal>[]>(() => {
    const cols: ColumnDef<Proposal>[] = [
      { accessorKey: "documentTitle", header: "Document", cell: ({ row }) => <span className="font-medium">{row.original.documentTitle}</span> },
      { accessorKey: "kind", header: "Kind", cell: ({ row }) => <Badge variant="outline" className="font-normal capitalize">{row.original.kind === "new" ? "New page" : row.original.kind}</Badge>, filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)) },
      { accessorKey: "proposedBy", header: "Proposed by", cell: ({ row }) => <span className="flex items-center gap-1.5">{row.original.proposerKind === "agent" ? <Bot className="size-3.5 text-muted-foreground" /> : <UserRound className="size-3.5 text-muted-foreground" />}{row.original.proposedBy}</span> },
      { accessorKey: "at", header: "When", cell: ({ row }) => <span className="text-muted-foreground">{relative(row.original.at)}</span> },
      { accessorKey: "sizeDelta", header: "Δ size", meta: { align: "right" }, cell: ({ row }) => <span className={cn(row.original.sizeDelta < 0 && "text-destructive")}>{row.original.sizeDelta >= 0 ? "+" : "−"}{bytes(Math.abs(row.original.sizeDelta))}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => row.original.status === "pending" ? <StatusBadge tone="info" icon={FileCheck2} label="Pending" /> : row.original.status === "approved" ? <StatusBadge tone="good" icon={Check} label="Approved" /> : <StatusBadge tone="bad" icon={X} label="Rejected" /> },
    ]
    if (admin && status === "pending") cols.unshift(selectColumn<Proposal>())
    return cols
  }, [admin, status])

  return (
    <PageStateGate state={state}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={status} onValueChange={(v) => router.replace(`?status=${v}`)}>
            <TabsList>
              <TabsTrigger value="pending">Pending {counts.pending > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 font-normal">{counts.pending}</Badge>}</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          {admin && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Automation</span>
              <Select value={kb.automation} onValueChange={(v) => { updateKb(kb.id, { automation: v as "act" | "suggest" }); toast.success(v === "act" ? "Assistant writes land directly as revertible revisions" : "Assistant writes come here first") }}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="suggest">Suggest</SelectItem><SelectItem value="act">Act</SelectItem></SelectContent>
              </Select>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Changes an assistant or a member proposed to text and file documents, reviewed before they enter the index. Connector content is read-only and cannot be proposed against.</p>
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => r.id}
          hideViewOptions
          onRowClick={(r) => { setOpen(r); setComment("") }}
          filters={[{ column: "kind", title: "Kind", options: [{ label: "Append", value: "append" }, { label: "Update", value: "update" }, { label: "New page", value: "new" }] }]}
          bulkActions={admin && status === "pending" ? [
            { label: "Approve", icon: Check, onClick: (rows) => { rows.forEach((r) => approve(r.id)); toast.success(`Approved ${rows.length}`) } },
            { label: "Reject", icon: X, variant: "destructive", onClick: (rows) => { rows.forEach((r) => reject(r.id)); toast.success(`Rejected ${rows.length}`) } },
          ] : []}
          emptyState={<div className="rounded-lg border"><EmptyState icon={FileCheck2} title={status === "pending" ? "No pending proposals" : `No ${status} proposals`} description="A proposal is a suggested change to a document from the assistant or a member. Approving writes a revision and reprocesses the item." action={{ label: "Open chat", href: `/w/northwind/chat` }} /></div>}
        />
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
          {open && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex flex-wrap items-center gap-2">{open.documentTitle} <Badge variant="outline" className="font-normal capitalize">{open.kind === "new" ? "New page" : open.kind}</Badge></SheetTitle>
                <SheetDescription>Proposed by {open.proposedBy} · {relative(open.at)}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="rounded-md bg-muted/50 p-3 text-sm"><span className="font-medium">Note: </span>{open.note}</div>
                <Diff before={open.before} after={open.after} />
                {admin && open.status === "pending" && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Comment (optional)</span>
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Why this is approved or rejected" />
                  </div>
                )}
              </div>
              {admin && open.status === "pending" && (
                <SheetFooter className="flex-row justify-end border-t">
                  <Button variant="outline" onClick={() => { reject(open.id, comment); toast.success("Rejected"); setOpen(null) }}><X className="size-4" /> Reject</Button>
                  <Button onClick={() => { approve(open.id); toast.success("Approved", { description: "A revision was written and the item is reprocessing." }); setOpen(null) }}><Check className="size-4" /> Approve</Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageStateGate>
  )
}

export default function KbProposalsPage() {
  return (
    <Suspense fallback={null}>
      <ProposalsInner />
    </Suspense>
  )
}
