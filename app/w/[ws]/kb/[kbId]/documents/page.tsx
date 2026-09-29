"use client"

import { Suspense, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { FileText, X, RefreshCw, MinusCircle, Tag } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { ItemStatusBadge, FreshnessBadge, MimeIcon, SensitivityBadge } from "@/components/shared/status-badge"
import { DocumentSheet } from "@/components/knowledge/document-sheet"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, shortDate } from "@/lib/format"
import type { Item } from "@/lib/mock/types"

function DocumentsInner() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const items = useMock((s) => s.items)
  const sources = useMock((s) => s.sources)
  const reprocessItem = useMock((s) => s.reprocessItem)
  const excludeItem = useMock((s) => s.excludeItem)
  const setItemTags = useMock((s) => s.setItemTags)
  const [open, setOpen] = useState<string | null>(search.get("doc"))

  const statusParam = search.get("status")
  const freshnessParam = search.get("freshness")
  const sourceIds = kb.sources.map((l) => l.sourceId)
  const isStale = (it: Item) => new Date(it.reviewBy).getTime() < Date.now()

  const data = useMemo(() => {
    if (state === "empty") return []
    let rows = items.filter((it) => sourceIds.includes(it.sourceId) && it.status !== "excluded")
    if (statusParam) rows = rows.filter((it) => it.status === statusParam)
    if (freshnessParam === "stale") rows = rows.filter(isStale)
    return rows
  }, [items, sourceIds.join(","), statusParam, freshnessParam, state]) // eslint-disable-line react-hooks/exhaustive-deps

  const srcName = (id: string) => sources.find((s) => s.id === id)?.name ?? id
  const current = open ? items.find((it) => it.id === open) : undefined
  const root = `${base}/kb/${kb.id}/documents`

  const columns = useMemo<ColumnDef<Item>[]>(() => {
    const cols: ColumnDef<Item>[] = [
      {
        accessorKey: "title",
        header: ({ column }) => <SortHeader column={column} title="Title" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <MimeIcon mime={row.original.mimeType} />
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.title}</div>
              <div className="truncate text-xs text-muted-foreground">{row.original.owner} · <span className="font-mono">{row.original.version}</span> · effective {row.original.effectiveDate}</div>
            </div>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.title} ${row.original.path}`.toLowerCase().includes(value.toLowerCase()),
      },
      { id: "source", accessorFn: (r) => r.sourceId, header: "Source", cell: ({ row }) => <span className="text-muted-foreground">{srcName(row.original.sourceId)}</span>, filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)) },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (row.original.status === "failed" ? (
          <Tooltip><TooltipTrigger asChild><span><ItemStatusBadge status="failed" /></span></TooltipTrigger><TooltipContent className="max-w-xs">{row.original.error}</TooltipContent></Tooltip>
        ) : <ItemStatusBadge status={row.original.status} />),
        filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)),
      },
      { accessorKey: "chunkCount", header: ({ column }) => <SortHeader column={column} title="Chunks" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.chunkCount) },
      { accessorKey: "modifiedAt", header: ({ column }) => <SortHeader column={column} title="Modified" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{shortDate(row.original.modifiedAt)}</span> },
      { id: "freshness", accessorFn: (r) => (isStale(r) ? "stale" : "fresh"), header: "Freshness", cell: ({ row }) => <FreshnessBadge reviewBy={row.original.reviewBy} />, filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)) },
      { accessorKey: "sensitivity", header: "Sensitivity", cell: ({ row }) => <SensitivityBadge level={row.original.sensitivity} />, filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)) },
      { id: "tags", accessorFn: (r) => r.tags, header: "Tags", cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>)}</div>, filterFn: (row, id, v: string[]) => (row.getValue(id) as string[]).some((t) => v.includes(t)) },
      { accessorKey: "queries30d", header: ({ column }) => <SortHeader column={column} title="Queries · 30d" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.queries30d) },
    ]
    if (admin) cols.unshift(selectColumn<Item>())
    return cols
  }, [admin, sources]) // eslint-disable-line react-hooks/exhaustive-deps

  const tagOptions = Array.from(new Set(data.flatMap((d) => d.tags))).map((t) => ({ label: t, value: t }))
  const never = kb.health === "never"

  return (
    <PageStateGate state={state}>
      <div className="flex flex-col gap-3">
        {(statusParam || freshnessParam) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Showing</span>
            {statusParam && <Badge variant="outline" className="gap-1 font-normal">status = {statusParam}</Badge>}
            {freshnessParam && <Badge variant="outline" className="gap-1 font-normal">freshness = {freshnessParam}</Badge>}
            <Button variant="ghost" size="sm" className="h-7" onClick={() => router.replace(root)}><X className="size-3.5" /> Clear</Button>
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => r.id}
          searchColumn="title"
          searchPlaceholder="Search by title or path…"
          pageSize={25}
          onRowClick={(r) => setOpen(r.id)}
          rowClassName={(r) => (r.status === "failed" ? "bg-destructive/5" : undefined)}
          filters={[
            { column: "source", title: "Source", options: kb.sources.map((l) => ({ label: srcName(l.sourceId), value: l.sourceId })) },
            { column: "status", title: "Status", options: [{ label: "Indexed", value: "indexed" }, { label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Failed", value: "failed" }, { label: "Partial", value: "partial" }] },
            { column: "freshness", title: "Freshness", options: [{ label: "Fresh", value: "fresh" }, { label: "Stale", value: "stale" }] },
            { column: "sensitivity", title: "Sensitivity", options: [{ label: "Internal", value: "internal" }, { label: "Confidential", value: "confidential" }, { label: "Restricted", value: "restricted" }] },
            { column: "tags", title: "Tag", options: tagOptions },
          ]}
          bulkActions={
            admin
              ? [
                  { label: "Reprocess", icon: RefreshCw, onClick: (rows) => { rows.forEach((r) => reprocessItem(r.id)); toast.success(`Reprocessing ${rows.length}`) } },
                  { label: "Add tag", icon: Tag, onClick: (rows) => { rows.forEach((r) => setItemTags(r.id, Array.from(new Set([...r.tags, "reviewed"])))); toast.success(`Tagged ${rows.length} as reviewed`) } },
                  { label: "Exclude", icon: MinusCircle, variant: "destructive", onClick: (rows) => { rows.forEach((r) => excludeItem(r.id)); toast.success(`Excluded ${rows.length}`) } },
                ]
              : []
          }
          emptyState={
            <div className="rounded-lg border">
              {never ? (
                <EmptyState icon={FileText} title="Nothing indexed yet" description="Documents appear here once the first index build finishes. Start it from the Overview tab." action={{ label: "Open Overview", href: `${base}/kb/${kb.id}` }} />
              ) : (
                <EmptyState icon={FileText} title="No documents" description="A document is one item a source produced: a file, a page, or a row set. This knowledge base's sources have not produced any yet." action={{ label: "Open Sources", href: `${base}/kb/${kb.id}/sources` }} />
              )}
            </div>
          }
        />
      </div>
      <DocumentSheet item={current} open={!!current} onOpenChange={(o) => { if (!o) { setOpen(null); if (search.get("doc")) router.replace(root) } }} onExclude={(it) => { excludeItem(it.id); setOpen(null) }} />
    </PageStateGate>
  )
}

export default function KbDocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsInner />
    </Suspense>
  )
}
