"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Download, FileJson, ScrollText, X, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader } from "@/components/shared/data-table"
import { EmptyState, PageStateGate, StatSkeleton, TableSkeleton } from "@/components/shared/states"
import { StatRow, StatTile } from "@/components/shared/stat-tile"
import { StatusBadge } from "@/components/shared/status-badge"
import { FieldRow } from "@/components/shared/surface"
import { CopyButton } from "@/components/shared/copy"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { dateTime, num } from "@/lib/format"
import type { AuditEvent, Proposal } from "@/lib/mock/types"

const RANGES = { "24h": 1, "7d": 7, "30d": 30 } as const
type Range = keyof typeof RANGES
const actorKind: Record<AuditEvent["actor"]["kind"], string> = { member: "Member", api_key: "API key", mcp_token: "MCP token", system: "System" }
const human = (s: string) => s.replace(/_/g, " ")

export function resourceHref(base: string, r: AuditEvent["resource"], proposals: Proposal[]): string | undefined {
  switch (r.type) {
    case "knowledge_base": return `${base}/kb/${r.id}`
    case "source": return `${base}/sources/${r.id}`
    case "tool": return `${base}/tools/${r.id}/general`
    case "file": return `${base}/files/${r.id}`
    case "member": return `${base}/team`
    case "mcp_token": return `${base}/connect/mcp`
    case "secret": return `${base}/secrets`
    case "integration": return `${base}/integrations`
    case "proposal": {
      const p = proposals.find((x) => x.id === r.id)
      return p ? `${base}/kb/${p.kbId}/proposals` : undefined
    }
    case "settings": return `${base}/settings/general`
    default: return undefined
  }
}

const fmt = (v: unknown) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v))

export function AuditPage() {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { base } = useWs()
  const audit = useMock((s) => s.audit)
  const proposals = useMock((s) => s.proposals)
  const [range, setRange] = useState<Range>("30d")
  const [open, setOpen] = useState<AuditEvent | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")
  const resourceFilter = params.get("resource")

  const inRange = useMemo(() => {
    if (state === "empty") return []
    const since = Date.now() - RANGES[range] * 86400_000
    let rows = audit.filter((e) => new Date(e.at).getTime() >= since)
    if (resourceFilter) {
      const [type, ...rest] = resourceFilter.split(":")
      const id = rest.join(":")
      rows = rows.filter((e) => e.resource.type === type && (!id || e.resource.id === id))
    }
    return rows
  }, [audit, range, resourceFilter, state])
  const data = useMemo(() => (typeFilter === "all" ? inRange : inRange.filter((e) => e.resource.type === typeFilter)), [inRange, typeFilter])
  const types = useMemo(() => Array.from(new Set(inRange.map((e) => e.resource.type))).sort(), [inRange])

  const failed = data.filter((e) => e.status === "failed").length
  const actors = new Set(data.map((e) => `${e.actor.kind}:${e.actor.name}`)).size
  const filteredName = resourceFilter ? audit.find((e) => `${e.resource.type}:${e.resource.id}` === resourceFilter)?.resource.name ?? resourceFilter : undefined

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      { accessorKey: "at", header: ({ column }) => <SortHeader column={column} title="Time" />, cell: ({ row }) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{dateTime(row.original.at)}</span> },
      {
        id: "actor",
        accessorFn: (r) => r.actor.name,
        header: "Actor",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">{actorKind[row.original.actor.kind]}</Badge>
            <span className="truncate">{row.original.actor.name}</span>
          </div>
        ),
        filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)),
      },
      { accessorKey: "action", header: "Action", cell: ({ row }) => <span className="font-mono text-xs">{human(row.original.action)}</span>, filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)) },
      {
        id: "resource",
        accessorFn: (r) => `${r.resource.name} ${r.resource.id}`,
        header: "Resource",
        cell: ({ row }) => {
          const r = row.original.resource
          const href = resourceHref(base, r, proposals)
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant="secondary" className="font-normal">{human(r.type)}</Badge>
              {href ? (
                <Link href={href} className="max-w-[220px] truncate hover:underline" onClick={(e) => e.stopPropagation()}>{r.name}</Link>
              ) : (
                <span className="max-w-[220px] truncate">{r.name}</span>
              )}
            </div>
          )
        },
        filterFn: (row, id, v: string) => String(row.getValue(id)).toLowerCase().includes(v.toLowerCase()),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (row.original.status === "success" ? <StatusBadge tone="good" icon={CheckCircle2} label="Success" /> : <StatusBadge tone="bad" icon={XCircle} label="Failed" />),
        filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)),
      },
      { accessorKey: "ip", header: "IP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span> },
    ],
    [base, proposals]
  )

  const uniq = (f: (e: AuditEvent) => string) => Array.from(new Set(data.map(f))).sort()
  const clearResource = () => {
    const p = new URLSearchParams(params.toString())
    p.delete("resource")
    router.replace(p.toString() ? `${pathname}?${p}` : pathname)
  }
  const diffKeys = open ? Array.from(new Set([...Object.keys(open.before ?? {}), ...Object.keys(open.after ?? {})])) : []

  return (
    <AdminOnly>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Audit log"
          description="Who changed what, when, and from where, for every object in the workspace."
          actions={
            <>
              <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                <SelectTrigger size="sm" className="w-[140px]" aria-label="Time range"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => toast.success("Exporting CSV", { description: `${num(data.length)} events for the current filter` })}><Download className="size-4" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success("Exporting JSON", { description: `${num(data.length)} events for the current filter` })}><FileJson className="size-4" /> JSON</Button>
            </>
          }
        />
        <PageStateGate state={state} loading={<><StatSkeleton n={3} /><TableSkeleton /></>}>
          <StatRow className="lg:grid-cols-3">
            <StatTile label="Events in range" value={num(data.length)} hint={`Last ${range === "24h" ? "24 hours" : range === "7d" ? "7 days" : "30 days"}`} />
            <StatTile label="Failed actions" value={num(failed)} tone={failed ? "bad" : "default"} hint={data.length ? `${((failed / data.length) * 100).toFixed(1)}% of events` : undefined} />
            <StatTile label="Distinct actors" value={num(actors)} hint="Members, keys, tokens and the system" />
          </StatRow>
          {resourceFilter && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Showing history for</span>
              <Badge variant="secondary" className="gap-1 pr-1 font-normal">
                {human(resourceFilter.split(":")[0])}: {filteredName}
                <button type="button" onClick={clearResource} className="rounded-sm hover:bg-foreground/10" aria-label="Clear resource filter"><X className="size-3" /></button>
              </Badge>
            </div>
          )}
          <DataTable
            columns={columns}
            data={data}
            getRowId={(r) => r.id}
            searchColumn="resource"
            searchPlaceholder="Search resource name or id…"
            initialSorting={[{ id: "at", desc: true }]}
            onRowClick={setOpen}
            hideViewOptions
            toolbarExtra={
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger size="sm" className="h-8 w-[170px] border-dashed" aria-label="Resource type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All resource types</SelectItem>
                  {types.map((t) => <SelectItem key={t} value={t}>{human(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            }
            filters={[
              { column: "actor", title: "Actor", options: uniq((e) => e.actor.name).map((v) => ({ label: v, value: v })) },
              { column: "action", title: "Action", options: uniq((e) => e.action).map((v) => ({ label: human(v), value: v })) },
              { column: "status", title: "Status", options: [{ label: "Success", value: "success" }, { label: "Failed", value: "failed" }] },
            ]}
            emptyState={
              <div className="rounded-lg border">
                <EmptyState icon={ScrollText} title="No events" description="An event is recorded whenever a person, key, token or the system changes or uses an object. Nothing happened in this range." action={range !== "30d" ? { label: "Show the last 30 days", onClick: () => setRange("30d") } : undefined} />
              </div>
            }
          />
          <p className="text-xs text-muted-foreground">Events are kept for 365 days.</p>
        </PageStateGate>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          {open && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="pr-6">{open.actor.name} {human(open.action)} {open.resource.name}</SheetTitle>
                <SheetDescription>{dateTime(open.at)}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-4">
                <div>
                  <FieldRow label="Actor" value={`${actorKind[open.actor.kind]} · ${open.actor.name}`} />
                  <FieldRow label="Action" value={<span className="font-mono text-xs">{human(open.action)}</span>} />
                  <FieldRow
                    label="Resource"
                    wrap
                    value={
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-normal">{human(open.resource.type)}</Badge>
                        {resourceHref(base, open.resource, proposals) ? <Link href={resourceHref(base, open.resource, proposals)!} className="hover:underline">{open.resource.name}</Link> : open.resource.name}
                        <span className="font-mono text-xs text-muted-foreground">{open.resource.id}</span>
                      </span>
                    }
                  />
                  <FieldRow label="Status" value={open.status === "success" ? <StatusBadge tone="good" icon={CheckCircle2} label="Success" /> : <StatusBadge tone="bad" icon={XCircle} label="Failed" />} />
                  <FieldRow label="IP address" value={open.ip} mono />
                  <FieldRow label="User agent" value={open.userAgent} wrap />
                  <FieldRow label="Request id" value={<span className="flex items-center gap-1">{open.requestId}<CopyButton text={open.requestId} iconOnly variant="ghost" label="Copy request id" /></span>} mono />
                  <FieldRow label="Event id" value={<span className="flex items-center gap-1">{open.id}<CopyButton text={open.id} iconOnly variant="ghost" label="Copy event id" /></span>} mono />
                </div>
                {diffKeys.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Changes</h3>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Field</TableHead>
                            <TableHead>Before</TableHead>
                            <TableHead>After</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {diffKeys.map((k) => (
                            <TableRow key={k}>
                              <TableCell className="font-mono text-xs">{k}</TableCell>
                              <TableCell className="whitespace-normal font-mono text-xs text-muted-foreground line-through decoration-destructive/50">{fmt(open.before?.[k])}</TableCell>
                              <TableCell className="whitespace-normal font-mono text-xs">{fmt(open.after?.[k])}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                <CopyButton text={open.id} label="Copy event id" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminOnly>
  )
}
