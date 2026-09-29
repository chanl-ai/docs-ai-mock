"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, XCircle, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatTile, StatRow } from "@/components/shared/stat-tile"
import { Section, Rows, Row } from "@/components/shared/surface"
import { RunStatusBadge, KbHealthBadge } from "@/components/shared/status-badge"
import { PageStateGate, StatSkeleton, ErrorState } from "@/components/shared/states"
import { SourceTypeIcon } from "@/lib/mock/source-types"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { dateTime, duration, num, relative } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"

export default function KbOverviewPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { base } = useWs()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const sources = useMock((s) => s.sources)
  const refreshKb = useMock((s) => s.refreshKb)
  const retryKbFailed = useMock((s) => s.retryKbFailed)
  const cancelKbJob = useMock((s) => s.cancelKbJob)
  const root = `${base}/kb/${kb.id}`
  const never = state === "empty" || kb.health === "never"

  return (
    <PageStateGate state={state} loading={<><StatSkeleton n={5} /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div></>} error={<ErrorState title="Could not load the index status" message="The stats request failed. The index itself is unaffected; retry to reload." onRetry={() => window.location.reload()} />}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="Documents" value={never ? 0 : num(kb.stats.documents)} hint={`${kb.sources.length} source${kb.sources.length === 1 ? "" : "s"}`} />
          <StatTile label="Chunks" value={never ? 0 : num(kb.stats.chunks)} hint={kb.stats.documents ? `${(kb.stats.chunks / Math.max(kb.stats.documents, 1)).toFixed(1)} per document` : undefined} />
          <StatTile label="Last refreshed" value={never ? "Never" : relative(kb.lastRefreshedAt)} hint={kb.jobs[0] ? `${kb.jobs[0].trigger}` : undefined} />
          <StatTile label="Failures" value={never ? 0 : num(kb.stats.failures)} tone={kb.stats.failures && !never ? "bad" : "default"} hint={kb.stats.failures ? "view" : "none"} href={kb.stats.failures ? `${root}/documents?status=failed` : undefined} />
          <StatTile label="Stale" value={never ? 0 : num(kb.stats.stale)} tone={kb.stats.stale && !never ? "warn" : "default"} hint={kb.stats.stale ? "past review-by date · view" : "none"} href={kb.stats.stale ? `${root}/documents?freshness=stale` : undefined} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Sources" description="What this knowledge base reads" actions={admin && <Button asChild variant="ghost" size="sm" className="h-7"><Link href={`${root}/sources`}>Manage <ArrowRight className="size-3.5" /></Link></Button>} flush>
            <Rows>
              {kb.sources.map((l) => {
                const s = sources.find((x) => x.id === l.sourceId)
                if (!s) return null
                return (
                  <Row
                    key={l.sourceId}
                    href={admin ? `${base}/sources/${s.id}` : undefined}
                    leading={<SourceTypeIcon type={s.type} />}
                    title={s.name}
                    description={`${num(l.itemsContributed)} items${l.rules.length ? ` · ${l.rules.length} rule${l.rules.length === 1 ? "" : "s"}` : ""} · synced ${relative(s.lastSyncAt)}`}
                    trailing={<RunStatusBadge status={s.status === "revoked" ? "failed" : s.lastRunStatus} />}
                  />
                )
              })}
              {kb.sources.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">This knowledge base reads no sources.</li>}
            </Rows>
          </Section>

          <Section title={<span className="flex items-center gap-2">Health <KbHealthBadge health={never ? "never" : kb.health} /></span>} description="Why the badge says what it says">
            {never ? (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Never indexed. Build the index to start answering questions.</p>
                {admin && <Button size="sm" onClick={() => { refreshKb(kb.id); toast.success("Index build started") }}><RefreshCw className="size-4" /> Build index</Button>}
              </div>
            ) : (
              <div className="space-y-3">
                {kb.indexing && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin text-muted-foreground" /> Indexing</span>
                      <span className="tabular-nums text-muted-foreground">{num(kb.indexing.done)} of {num(kb.indexing.total)} items</span>
                    </div>
                    <Progress value={(kb.indexing.done / kb.indexing.total) * 100} className="h-1.5" />
                  </div>
                )}
                <ul className="space-y-1.5 text-sm">
                  {kb.healthReasons.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      {kb.health === "healthy" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : kb.health === "failed" ? <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : kb.health === "indexing" ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-blue-500" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />}
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  Healthy: last refresh succeeded and failures = 0. Indexing: a job is running. Degraded: failures &gt; 0 or stale items above 10% of documents. Failed: last refresh failed.
                </div>
                {admin && (
                  <div className="flex flex-wrap gap-2">
                    {kb.indexing ? (
                      <Button size="sm" variant="outline" onClick={() => { cancelKbJob(kb.id); toast.message("Refresh cancelled") }}>Cancel running job</Button>
                    ) : (
                      <>
                        {kb.stats.failures > 0 && <Button size="sm" variant="outline" onClick={() => { retryKbFailed(kb.id); toast.success("Retrying failed items") }}><RotateCcw className="size-4" /> Retry failed</Button>}
                        <Button size="sm" onClick={() => { refreshKb(kb.id); toast.success("Index refresh started") }}><RefreshCw className="size-4" /> Refresh index</Button>
                        {kb.stats.failures > 0 && <Button asChild size="sm" variant="ghost"><Link href={`${root}/documents?status=failed`}>View failures</Link></Button>}
                        {kb.stats.stale > 0 && <Button asChild size="sm" variant="ghost"><Link href={`${root}/documents?freshness=stale`}>View stale</Link></Button>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        <Section title="Precedence" description="When two documents disagree, the answer says which one it followed." flush>
          <ol className="divide-y">
            {kb.precedence.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{p.label}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{p.winner} <ArrowRight className="inline size-3" /> {p.loser}</span>
              </li>
            ))}
            {kb.precedence.length === 0 && <li className="px-4 py-4 text-sm text-muted-foreground">No precedence rules; the highest-scoring chunk wins.</li>}
          </ol>
          {admin && <div className="border-t px-4 py-2 text-xs"><Link href={`${root}/retrieval#precedence`} className="text-muted-foreground hover:text-foreground">Edit on the Retrieval tab</Link></div>}
        </Section>

        <Section title="Recent index jobs" flush>
          {never ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Started</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kb.jobs.slice(0, 10).map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="whitespace-nowrap">{dateTime(j.startedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{j.trigger}</TableCell>
                      <TableCell className="text-right tabular-nums">{j.status === "running" ? "—" : duration(j.durationSec)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(j.processed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{j.failed ? <span className="text-destructive">{num(j.failed)}</span> : "0"}</TableCell>
                      <TableCell><RunStatusBadge status={j.status} /></TableCell>
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
