"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { History, MoreHorizontal, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataTable, SortHeader } from "@/components/shared/data-table"
import { RunStatusBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { dateTime, duration, num, relative } from "@/lib/format"
import type { SyncRun } from "@/lib/mock/types"
import { backoffRetryAt, IndeterminateProgress, useRouteSource } from "./source-helpers"
import { RunSheet } from "./run-sheet"

const triggerLabel: Record<SyncRun["trigger"], string> = { manual: "Manual", schedule: "Schedule", webhook: "Webhook", full: "Full resync", retry: "Retry failed" }

export function SourceHistory() {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { source } = useRouteSource()
  const runs = useMock((s) => s.runs)
  const syncSource = useMock((s) => s.syncSource)
  const runId = params.get("run")

  const data = useMemo(() => (state === "empty" || !source ? [] : runs.filter((r) => r.sourceId === source.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))), [runs, source, state])
  const anyRunning = data.some((r) => r.status === "running")
  const openRun = runId ? runs.find((r) => r.id === runId) : undefined

  const setRun = (id: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (id) next.set("run", id)
    else next.delete("run")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const columns = useMemo<ColumnDef<SyncRun>[]>(
    () => [
      { accessorKey: "startedAt", header: ({ column }) => <SortHeader column={column} title="Started" />, cell: ({ row }) => <div className="whitespace-nowrap"><div>{dateTime(row.original.startedAt)}</div><div className="text-xs text-muted-foreground">{relative(row.original.startedAt)}</div></div> },
      { accessorKey: "trigger", header: "Trigger", cell: ({ row }) => <span className="whitespace-nowrap">{triggerLabel[row.original.trigger]}</span>, filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)) },
      { accessorKey: "durationSec", header: ({ column }) => <SortHeader column={column} title="Duration" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.status === "running" ? "—" : duration(row.original.durationSec)}</span> },
      { id: "listed", accessorFn: (r) => r.counts.listed, header: ({ column }) => <SortHeader column={column} title="Listed" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="tabular-nums">{num(row.original.counts.listed)}</span> },
      { id: "changed", accessorFn: (r) => r.counts.upserted + r.counts.deleted, header: ({ column }) => <SortHeader column={column} title="Changed" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="tabular-nums">{num(row.original.counts.upserted + row.original.counts.deleted)}</span> },
      { id: "failed", accessorFn: (r) => r.counts.failed, header: ({ column }) => <SortHeader column={column} title="Failed" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className={row.original.counts.failed ? "tabular-nums text-destructive" : "tabular-nums"}>{num(row.original.counts.failed)}</span> },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <RunStatusBadge status={row.original.status} />
            {row.original.status === "running" && <IndeterminateProgress />}
            {row.original.status === "backing_off" && <span className="whitespace-nowrap text-xs text-muted-foreground">Retries {relative(backoffRetryAt(row.original))}</span>}
          </div>
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
                <Button variant="ghost" size="icon" className="size-8" aria-label="Run actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRun(row.original.id)}>Open run</DropdownMenuItem>
                <DropdownMenuItem disabled={anyRunning || row.original.counts.failed === 0 || source?.status === "revoked"} onClick={() => { syncSource(row.original.sourceId, { retry: true }); toast.success("Retrying failed items") }}><RotateCcw className="size-4" /> Retry failed items</DropdownMenuItem>
                <DropdownMenuItem disabled={anyRunning || source?.status === "revoked"} onClick={() => { syncSource(row.original.sourceId, { full: row.original.trigger === "full", retry: row.original.trigger === "retry" }); toast.success("Run started with the same options") }}><RefreshCw className="size-4" /> Re-run with same options</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("Log downloaded", { description: `${row.original.id}.log` })}>Download log</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [anyRunning, source, params], // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (!source) return null

  return (
    <PageStateGate state={state === "empty" ? "ready" : state}>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        onRowClick={(r) => setRun(r.id)}
        rowClassName={(r) => (r.status === "failed" ? "bg-destructive/5" : undefined)}
        filters={[
          { column: "status", title: "Status", options: [{ label: "Success", value: "success" }, { label: "Partial", value: "partial" }, { label: "Failed", value: "failed" }, { label: "Running", value: "running" }, { label: "Backing off", value: "backing_off" }] },
          { column: "trigger", title: "Trigger", options: Object.entries(triggerLabel).map(([value, label]) => ({ label, value })) },
        ]}
        emptyState={
          <div className="rounded-lg border">
            <EmptyState
              icon={History}
              title="No sync runs yet"
              description="A run is one pass over the source: list changes, fetch, parse, chunk, embed and upsert. Each run is recorded here with its counts and errors."
              action={source.status === "revoked" ? undefined : { label: "Sync now", onClick: () => { syncSource(source.id); toast.success("Sync started", { description: source.name }) } }}
            />
          </div>
        }
      />
      <RunSheet run={openRun} open={!!openRun} onOpenChange={(o) => !o && setRun(null)} />
    </PageStateGate>
  )
}
