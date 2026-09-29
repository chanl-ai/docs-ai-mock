"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Activity, Download, MoreHorizontal, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader } from "@/components/shared/data-table"
import { ExecutionStatusBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate, StatSkeleton, TableSkeleton } from "@/components/shared/states"
import { StatRow, StatTile } from "@/components/shared/stat-tile"
import { useCopy } from "@/components/shared/copy"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { ms, num, pct, relative } from "@/lib/format"
import type { Execution } from "@/lib/mock/types"
import { ExecutionSheet, triggerLabel } from "./execution-sheet"

const ranges = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const
type Range = keyof typeof ranges

function median(xs: number[]) {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function ExecutionList({ executionId }: { executionId?: string }) {
  const state = usePageState()
  const params = useSearchParams()
  const { base } = useWs()
  const { admin } = useRole()
  const user = useMock((s) => s.user)
  const executions = useMock((s) => s.executions)
  const tools = useMock((s) => s.tools)
  const rerun = useMock((s) => s.rerunExecution)
  const cancel = useMock((s) => s.cancelExecution)
  const { copy } = useCopy()
  const [toolFilter, setToolFilter] = useState(params.get("tool") ?? "all")
  const [range, setRange] = useState<Range>("7d")
  const [openId, setOpenId] = useState<string | undefined>(executionId)

  const mine = (e: Execution) => admin || e.triggeredBy.name === user.name || e.triggeredBy.kind === "chat"
  const visible = useMemo(() => executions.filter(mine), [executions, admin, user.name]) // eslint-disable-line react-hooks/exhaustive-deps
  const data = useMemo(() => {
    if (state === "empty") return []
    const since = Date.now() - ranges[range] * 3600_000
    return visible.filter((e) => new Date(e.startedAt).getTime() >= since && (toolFilter === "all" || e.toolId === toolFilter))
  }, [visible, range, toolFilter, state])

  const finished = data.filter((e) => e.status === "success" || e.status === "failed")
  const successRate = finished.length ? finished.filter((e) => e.status === "success").length / finished.length : 0
  const failed = data.filter((e) => e.status === "failed").length

  const setUrl = (id?: string) => {
    const q = params.toString()
    window.history.replaceState(null, "", `${base}/executions${id ? `/${id}` : ""}${q ? `?${q}` : ""}`)
  }
  const open = (id: string) => { setOpenId(id); setUrl(id) }
  const close = () => { setOpenId(undefined); setUrl() }

  const columns = useMemo<ColumnDef<Execution>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Execution",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link href={`${base}/tools/${row.original.toolId}/general`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{row.original.toolName}</Link>
            <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
          </div>
        ),
        filterFn: (row, _id, value: string) => row.original.id.toLowerCase().includes(value.toLowerCase().trim()),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <span className={row.original.status === "running" ? "inline-flex animate-pulse" : "inline-flex"}><ExecutionStatusBadge status={row.original.status} /></span>,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      { accessorKey: "startedAt", header: ({ column }) => <SortHeader column={column} title="Started" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.startedAt)}</span> },
      {
        accessorKey: "durationMs",
        header: ({ column }) => <SortHeader column={column} title="Duration" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) => (row.original.status === "running" || row.original.status === "pending" ? <span className="text-muted-foreground">—</span> : <span className="whitespace-nowrap">{num(row.original.durationMs)} ms</span>),
      },
      {
        id: "trigger",
        accessorFn: (r) => r.triggeredBy.kind,
        header: "Triggered by",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="outline" className="shrink-0 font-normal">{triggerLabel[row.original.triggeredBy.kind]}</Badge>
            <span className="truncate text-sm">{row.original.triggeredBy.name}</span>
          </div>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      { accessorKey: "retries", header: ({ column }) => <SortHeader column={column} title="Retries" align="right" />, meta: { align: "right" }, cell: ({ row }) => row.original.retries },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const e = row.original
          return (
            <div onClick={(ev) => ev.stopPropagation()} className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => open(e.id)}>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { const n = rerun(e.id); if (n) toast.success("Re-ran with the same input", { description: n.id }) }}><RotateCcw className="size-4" /> Re-run</DropdownMenuItem>
                  {e.status === "running" && <DropdownMenuItem onClick={() => { cancel(e.id); toast.success("Execution cancelled", { description: e.id }) }}>Cancel</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => copy(e.id, "Execution id copied")}>Copy id</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [base, rerun, cancel], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const toolName = tools.find((t) => t.id === toolFilter)?.name ?? executions.find((e) => e.toolId === toolFilter)?.toolName

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Executions"
        description={admin ? "Every tool run in this workspace: who or what triggered it, how long it took, and what failed." : "Tool runs you started, and runs from chat conversations you can see."}
        actions={
          <>
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger size="sm" className="w-36" aria-label="Date range"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => toast.success("Export started", { description: `${num(data.length)} executions as CSV. The file downloads when it is ready.` })}><Download className="size-4" /> Export CSV</Button>
          </>
        }
      />
      <PageStateGate state={state} loading={<div className="space-y-5"><StatSkeleton /><TableSkeleton cols={6} /></div>}>
        <StatRow>
          <StatTile label="Total" value={num(data.length)} hint={range === "24h" ? "Last 24 hours" : range === "7d" ? "Last 7 days" : "Last 30 days"} />
          <StatTile label="Success rate" value={finished.length ? pct(successRate, 1) : "—"} tone={successRate && successRate < 0.95 ? "warn" : "default"} hint={`${num(finished.length)} finished runs`} />
          <StatTile label="Median duration" value={ms(median(finished.map((e) => e.durationMs)))} hint="Finished runs only" />
          <StatTile label="Failed" value={num(failed)} tone={failed ? "bad" : "default"} hint={failed ? "Open a row to see the error" : "Nothing failed"} />
        </StatRow>
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => r.id}
          searchColumn="id"
          searchPlaceholder="Search by execution id…"
          onRowClick={(r) => open(r.id)}
          initialSorting={[{ id: "startedAt", desc: true }]}
          filters={[
            { column: "status", title: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Running", value: "running" }, { label: "Success", value: "success" }, { label: "Failed", value: "failed" }, { label: "Cancelled", value: "cancelled" }] },
            ...(admin ? [{ column: "trigger", title: "Triggered by", options: (Object.keys(triggerLabel) as Execution["triggeredBy"]["kind"][]).map((k) => ({ label: triggerLabel[k], value: k })) }] : []),
          ]}
          toolbarExtra={
            <>
              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger size="sm" className="h-8 w-44 border-dashed" aria-label="Tool"><SelectValue placeholder="Tool" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tools</SelectItem>
                  {tools.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {toolFilter !== "all" && (
                <Badge variant="secondary" className="h-8 gap-1 rounded-md px-2 font-normal">
                  Tool: {toolName}
                  <button type="button" className="rounded-sm hover:bg-foreground/10" aria-label="Clear tool filter" onClick={() => setToolFilter("all")}><X className="size-3" /></button>
                </Badge>
              )}
            </>
          }
          emptyState={
            <div className="rounded-lg border">
              <EmptyState
                icon={Activity}
                title="No executions in this range"
                description={toolFilter !== "all" ? `${toolName ?? "This tool"} has not run in the selected range. An execution is logged every time a tool runs, from chat, MCP, an API key or a test.` : "An execution is logged every time a tool runs, from chat, MCP, an API key or a test. Widen the range or run a tool from its Test tab."}
                action={range !== "30d" ? { label: "Show last 30 days", onClick: () => setRange("30d") } : { label: "Open tools", href: `${base}/tools` }}
                secondaryAction={toolFilter !== "all" ? { label: "All tools", onClick: () => setToolFilter("all") } : undefined}
              />
            </div>
          }
        />
      </PageStateGate>
      <ExecutionSheet
        execution={openId ? executions.find((e) => e.id === openId) : undefined}
        visible={!!openId && !!executions.find((e) => e.id === openId && mine(e))}
        open={!!openId}
        onOpenChange={(o) => !o && close()}
        onSelect={open}
      />
    </div>
  )
}
