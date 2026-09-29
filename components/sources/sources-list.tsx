"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Copy, MoreHorizontal, Pause, Play, Plug, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { RunStatusBadge, SourceStatusBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, relative } from "@/lib/format"
import { SourceTypeIcon, scheduleLabel, sourceTypeMeta, sourceTypes } from "@/lib/mock/source-types"
import type { Source } from "@/lib/mock/types"
import { IndeterminateProgress, SourceDeleteDialog } from "./source-helpers"

// Revoked and failed first, then partial, then everything else in seed order.
const attentionRank = (s: Source) => (s.status === "revoked" || s.lastRunStatus === "failed" ? 0 : s.lastRunStatus === "partial" ? 1 : 2)

export function SourcesList() {
  const state = usePageState()
  const router = useRouter()
  const { base } = useWs()
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const runs = useMock((s) => s.runs)
  const syncSource = useMock((s) => s.syncSource)
  const pauseSource = useMock((s) => s.pauseSource)
  const deleteSource = useMock((s) => s.deleteSource)
  const [deleting, setDeleting] = useState<Source | null>(null)
  const [bulkDelete, setBulkDelete] = useState<Source[] | null>(null)

  const data = useMemo(() => (state === "empty" ? [] : [...sources].sort((a, b) => attentionRank(a) - attentionRank(b))), [sources, state])
  const kbName = (id: string) => kbs.find((k) => k.id === id)?.name ?? id
  const isRunning = (id: string) => runs.some((r) => r.sourceId === id && r.status === "running")

  const sync = (s: Source) => {
    syncSource(s.id)
    toast.success("Sync started", { description: s.name })
  }
  const togglePause = (s: Source) => {
    const pausing = s.status !== "paused"
    pauseSource(s.id, pausing)
    toast.success(pausing ? "Schedule paused" : "Schedule resumed", { description: s.name })
  }

  const columns = useMemo<ColumnDef<Source>[]>(
    () => [
      selectColumn<Source>(),
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 max-w-[260px] items-center gap-2.5">
            <SourceTypeIcon type={row.original.type} />
            <div className="min-w-0">
              <Link href={`${base}/sources/${row.original.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                {row.original.name}
              </Link>
              <div className="truncate font-mono text-xs text-muted-foreground">{row.original.connectionLabel ?? row.original.scopeSummary}</div>
            </div>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.name} ${row.original.connectionLabel ?? ""} ${row.original.scopeSummary}`.toLowerCase().includes(value.toLowerCase()),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <span className="whitespace-nowrap">{sourceTypeMeta(row.original.type).short}</span>,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "items",
        accessorFn: (r) => r.itemsIndexed,
        header: ({ column }) => <SortHeader column={column} title="Items" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {num(row.original.itemsIndexed)}
            <span className="text-muted-foreground"> / </span>
            <span className={row.original.itemsFailed > 0 ? "text-destructive" : "text-muted-foreground"}>{num(row.original.itemsFailed)}</span>
          </span>
        ),
      },
      {
        id: "usedBy",
        accessorFn: (r) => r.usedByKbIds,
        header: ({ column }) => <SortHeader column={column} title="Used by" align="right" />,
        meta: { align: "right" },
        sortingFn: (a, b) => a.original.usedByKbIds.length - b.original.usedByKbIds.length,
        cell: ({ row }) =>
          row.original.usedByKbIds.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default whitespace-nowrap tabular-nums underline decoration-dotted underline-offset-4">
                  {row.original.usedByKbIds.length} KB{row.original.usedByKbIds.length === 1 ? "" : "s"}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <ul className="text-xs">{row.original.usedByKbIds.map((id) => <li key={id}>{kbName(id)}</li>)}</ul>
              </TooltipContent>
            </Tooltip>
          ),
        filterFn: (row, id, value: string[]) => (row.getValue(id) as string[]).some((v) => value.includes(v)),
      },
      {
        id: "schedule",
        accessorFn: (r) => r.schedule.kind,
        header: "Schedule",
        cell: ({ row }) => <span className="whitespace-nowrap">{scheduleLabel(row.original.schedule)}</span>,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "status",
        accessorFn: (r) => r.status,
        header: "Status",
        cell: ({ row }) => <SourceStatusBadge status={row.original.status} />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "lastSync",
        accessorFn: (r) => r.lastSyncAt ?? "",
        header: ({ column }) => <SortHeader column={column} title="Last sync" />,
        cell: ({ row }) => {
          const running = isRunning(row.original.id)
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <RunStatusBadge status={running ? "running" : row.original.lastRunStatus} />
                {!running && row.original.lastSyncAt && <span className="whitespace-nowrap text-xs text-muted-foreground">{relative(row.original.lastSyncAt)}</span>}
              </div>
              {running && <IndeterminateProgress />}
            </div>
          )
        },
      },
      {
        id: "nextSync",
        accessorFn: (r) => r.nextSyncAt ?? "",
        header: ({ column }) => <SortHeader column={column} title="Next sync" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {row.original.status === "paused" ? "Paused" : row.original.status === "draft" || row.original.schedule.kind === "manual" ? "—" : relative(row.original.nextSyncAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const s = row.original
          return (
            <div onClick={(e) => e.stopPropagation()} className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${s.name}`}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`${base}/sources/${s.id}`)}>Open</DropdownMenuItem>
                  <DropdownMenuItem disabled={s.status === "revoked" || isRunning(s.id)} onClick={() => sync(s)}><RefreshCw className="size-4" /> Sync now</DropdownMenuItem>
                  <DropdownMenuItem disabled={s.status === "draft"} onClick={() => togglePause(s)}>
                    {s.status === "paused" ? <><Play className="size-4" /> Resume schedule</> : <><Pause className="size-4" /> Pause schedule</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`${base}/sources/new?type=${s.type}`)}><Copy className="size-4" /> Duplicate settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(s)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [base, router, runs, kbs], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const usedTypes = Array.from(new Set(sources.map((s) => s.type)))

  return (
    <AdminOnly>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Sources"
          description="A source is how content gets in: uploaded files, a crawled site, or a connected app. Each one syncs on its own schedule."
          scope="Sources are workspace-wide; every knowledge base can read them."
          actions={
            <Button asChild size="sm">
              <Link href={`${base}/sources/new`}><Plus className="size-4" /> Add source</Link>
            </Button>
          }
        />
        <PageStateGate state={state}>
          <DataTable
            columns={columns}
            data={data}
            getRowId={(r) => r.id}
            searchColumn="name"
            searchPlaceholder="Search sources…"
            onRowClick={(r) => router.push(`${base}/sources/${r.id}`)}
            filters={[
              { column: "type", title: "Type", options: sourceTypes.filter((t) => usedTypes.includes(t.type)).map((t) => ({ label: t.short, value: t.type })) },
              { column: "status", title: "Status", options: [{ label: "Active", value: "active" }, { label: "Paused", value: "paused" }, { label: "Draft", value: "draft" }, { label: "Connection revoked", value: "revoked" }] },
              { column: "schedule", title: "Schedule", options: [{ label: "Manual", value: "manual" }, { label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }, { label: "Webhook", value: "webhook" }] },
              { column: "usedBy", title: "Used by KB", options: kbs.map((k) => ({ label: k.name, value: k.id })) },
            ]}
            bulkActions={[
              { label: "Sync now", icon: RefreshCw, onClick: (rows) => { const ok = rows.filter((r) => r.status !== "revoked" && !isRunning(r.id)); ok.forEach((r) => syncSource(r.id)); toast.success(`Syncing ${ok.length} source${ok.length === 1 ? "" : "s"}`, { description: ok.length < rows.length ? `${rows.length - ok.length} skipped: revoked or already running` : undefined }) } },
              { label: "Pause", icon: Pause, onClick: (rows) => { rows.forEach((r) => pauseSource(r.id, true)); toast.success(`Paused ${rows.length} schedule${rows.length === 1 ? "" : "s"}`) } },
              { label: "Delete", icon: Trash2, variant: "destructive", onClick: (rows) => setBulkDelete(rows) },
            ]}
            emptyState={
              <div className="rounded-lg border">
                <EmptyState
                  icon={Plug}
                  title="No sources"
                  description="A source is how content gets in: upload files, crawl a site, or connect an app."
                  action={{ label: "Add source", href: `${base}/sources/new` }}
                  secondaryAction={{ label: "Upload files", href: `${base}/files?upload=1` }}
                />
              </div>
            }
          />
        </PageStateGate>

        {deleting && <SourceDeleteDialog source={deleting} open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} />}
        {bulkDelete && (
          <ConfirmDialog
            open={!!bulkDelete}
            onOpenChange={(o) => !o && setBulkDelete(null)}
            title={`Delete ${bulkDelete.length} source${bulkDelete.length === 1 ? "" : "s"}?`}
            description={
              <div className="space-y-2">
                <p>{bulkDelete.map((s) => s.name).join(", ")}</p>
                <p>
                  {num(bulkDelete.reduce((n, s) => n + s.itemsIndexed + s.itemsFailed, 0))} items are removed. Chunks in {new Set(bulkDelete.flatMap((s) => s.usedByKbIds)).size} knowledge bases will be removed.
                </p>
              </div>
            }
            confirmLabel="Delete"
            destructive
            onConfirm={() => { bulkDelete.forEach((s) => deleteSource(s.id)); toast.success(`Deleted ${bulkDelete.length} source${bulkDelete.length === 1 ? "" : "s"}`); setBulkDelete(null) }}
          />
        )}
      </div>
    </AdminOnly>
  )
}
