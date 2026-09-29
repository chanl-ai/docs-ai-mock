"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Database, RefreshCw, RotateCcw, Square } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatRow, StatTile } from "@/components/shared/stat-tile"
import { Row, Rows, Section } from "@/components/shared/surface"
import { KbHealthBadge, RunStatusBadge } from "@/components/shared/status-badge"
import { PageStateGate, StatSkeleton, TableSkeleton } from "@/components/shared/states"
import { KbDot } from "@/components/knowledge/kb-dot"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { dateTime, duration, ms, num, relative } from "@/lib/format"
import { PhaseIcon, phaseLabel, phaseStatusLabel, runningRunFor, useRouteSource } from "./source-helpers"

export function SourceOverview() {
  const state = usePageState()
  const router = useRouter()
  const { base } = useWs()
  const { source } = useRouteSource()
  const runs = useMock((s) => s.runs)
  const allItems = useMock((s) => s.items)
  const kbs = useMock((s) => s.kbs)
  const syncSource = useMock((s) => s.syncSource)
  const cancelRun = useMock((s) => s.cancelRun)

  const sourceRuns = useMemo(() => (source ? runs.filter((r) => r.sourceId === source.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)) : []), [runs, source])
  const errorGroups = useMemo(() => {
    if (!source) return []
    const m = new Map<string, number>()
    allItems.forEach((i) => {
      if (i.sourceId === source.id && i.status === "failed") m.set(i.error ?? "Unknown error", (m.get(i.error ?? "Unknown error") ?? 0) + 1)
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [allItems, source])

  if (!source) return null
  const sbase = `${base}/sources/${source.id}`
  const running = runningRunFor(runs, source.id)
  const neverSynced = state === "empty" || (!source.lastSyncAt && sourceRuns.length === 0)
  const readers = kbs.filter((k) => source.usedByKbIds.includes(k.id) || k.sources.some((l) => l.sourceId === source.id))
  const blocked = source.status === "revoked"

  const sync = () => { syncSource(source.id); toast.success("Sync started", { description: source.name }) }

  return (
    <PageStateGate state={state === "empty" ? "ready" : state} loading={<><StatSkeleton n={5} /><TableSkeleton rows={5} /></>}>
      <div className="flex flex-col gap-4">
        {neverSynced && !running && (
          <Alert>
            <RefreshCw className="size-4" />
            <AlertTitle>This source has not synced yet</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Nothing has been fetched, so no knowledge base can answer from it. The first sync lists every item in scope.</p>
              <Button size="sm" onClick={sync} disabled={blocked}><RefreshCw className="size-4" /> Sync now</Button>
            </AlertDescription>
          </Alert>
        )}

        <StatRow className="grid-cols-2 lg:grid-cols-5">
          <StatTile label="Items indexed" value={num(neverSynced ? 0 : source.itemsIndexed)} hint="View all items" href={`${sbase}/items`} />
          <StatTile label="Failed" value={num(neverSynced ? 0 : source.itemsFailed)} tone={!neverSynced && source.itemsFailed > 0 ? "bad" : "default"} hint={!neverSynced && source.itemsFailed > 0 ? "View failed items" : "No failures"} href={!neverSynced && source.itemsFailed > 0 ? `${sbase}/items?status=failed` : undefined} />
          <StatTile label="Pending" value={num(neverSynced ? 0 : source.itemsPending)} hint={source.itemsPending ? "Waiting for the next run" : "Nothing waiting"} />
          <StatTile label="Last sync" value={neverSynced ? "Never" : relative(source.lastSyncAt)} hint={!neverSynced && source.lastRunDurationSec !== undefined ? `Took ${duration(source.lastRunDurationSec)}` : "No runs yet"} />
          <StatTile label="Next sync" value={source.status === "paused" ? "Paused" : source.schedule.kind === "manual" ? "Manual" : blocked ? "Blocked" : relative(source.nextSyncAt)} hint={source.status === "active" && source.nextSyncAt && source.schedule.kind !== "manual" ? dateTime(source.nextSyncAt) : blocked ? "Reconnect to resume" : "No schedule"} />
        </StatRow>

        {running && running.progress && (
          <Section
            title="Current run"
            description={`${running.trigger === "full" ? "Full resync" : running.trigger === "retry" ? "Retrying failed items" : "Incremental sync"} · started ${relative(running.startedAt)} · elapsed ${duration(Math.max(0, Math.round((Date.now() - new Date(running.startedAt).getTime()) / 1000)))}`}
            actions={<Button size="sm" variant="outline" onClick={() => { cancelRun(source.id); toast.message("Run cancelled", { description: "Items already processed stay indexed." }) }}><Square className="size-3.5" /> Cancel</Button>}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="tabular-nums">{num(running.progress.done)} of {num(running.progress.total)} items, {num(running.progress.failed)} failed</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round((running.progress.done / Math.max(running.progress.total, 1)) * 100)}%</span>
                </div>
                <Progress value={(running.progress.done / Math.max(running.progress.total, 1)) * 100} />
              </div>
              <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {running.phases.map((p) => (
                  <li key={p.name} className="flex items-center gap-2 text-sm">
                    <PhaseIcon status={p.status} />
                    <span className="min-w-0">
                      <span className="block truncate">{phaseLabel[p.name]}</span>
                      <span className="block text-xs text-muted-foreground">{p.status === "skipped" ? phaseStatusLabel(p.status) : ms(p.durationMs)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Used by" description={readers.length ? `${readers.length} knowledge base${readers.length === 1 ? "" : "s"} read this source` : undefined} flush>
            {readers.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-muted-foreground">
                <span>No knowledge base reads this source yet.</span>
                <Button asChild size="sm" variant="outline"><Link href={`${base}/kb`}>Open knowledge bases</Link></Button>
              </div>
            ) : (
              <Rows>
                {readers.map((k) => (
                  <Row key={k.id} href={`${base}/kb/${k.id}`} leading={<KbDot color={k.color} />} title={k.name} description={<span className="font-mono">{k.slug}</span>} trailing={<KbHealthBadge health={k.health} />} />
                ))}
              </Rows>
            )}
          </Section>

          <Section
            title="Errors"
            description={errorGroups.length ? "Most common failure messages across failed items" : undefined}
            actions={errorGroups.length ? (
              <>
                <Button size="sm" variant="outline" disabled={!!running || blocked} onClick={() => { syncSource(source.id, { retry: true }); toast.success("Retrying failed items", { description: `${source.itemsFailed} items` }) }}><RotateCcw className="size-3.5" /> Retry failed</Button>
                <Button asChild size="sm" variant="ghost"><Link href={`${sbase}/items?status=failed`}>View items</Link></Button>
              </>
            ) : undefined}
            flush
          >
            {errorGroups.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> No failed items.
              </div>
            ) : (
              <Rows>
                {errorGroups.map(([msg, count]) => (
                  <Row key={msg} leading={<AlertTriangle className="size-4 text-destructive" />} title={<span className="font-normal">{msg}</span>} trailing={<span className="tabular-nums text-muted-foreground">{count} item{count === 1 ? "" : "s"}</span>} />
                ))}
              </Rows>
            )}
          </Section>
        </div>

        <Section title="Recent runs" actions={sourceRuns.length ? <Button asChild size="sm" variant="ghost"><Link href={`${sbase}/history`}>View all</Link></Button> : undefined} flush>
          {sourceRuns.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground"><Database className="size-4" /> No runs yet. The first sync appears here.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Listed</TableHead>
                    <TableHead className="text-right">Changed</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceRuns.slice(0, 5).map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`${sbase}/history?run=${r.id}`)}>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`${sbase}/history?run=${r.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{dateTime(r.startedAt)}</Link>
                      </TableCell>
                      <TableCell className="capitalize">{r.trigger}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.status === "running" ? "—" : duration(r.durationSec)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.counts.listed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.counts.upserted + r.counts.deleted)}</TableCell>
                      <TableCell className={r.counts.failed > 0 ? "text-right tabular-nums text-destructive" : "text-right tabular-nums"}>{num(r.counts.failed)}</TableCell>
                      <TableCell><RunStatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>
      </div>
    </PageStateGate>
  )
}
