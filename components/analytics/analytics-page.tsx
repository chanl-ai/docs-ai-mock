"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { DateRange } from "react-day-picker"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { AlertTriangle, ArrowUpRight, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { PageHeader } from "@/components/shared/page-header"
import { StatRow, StatTile } from "@/components/shared/stat-tile"
import { Section, Rows, Row } from "@/components/shared/surface"
import { ErrorState, StatSkeleton } from "@/components/shared/states"
import { AdminOnly } from "@/components/shared/role-gate"
import { KbDot } from "@/components/knowledge/kb-dot"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { ms, num, pct, relative } from "@/lib/format"
import type { SeriesPoint } from "@/lib/mock/types"

const RANGES = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 } as const
type Range = keyof typeof RANGES
const KB_KEYS = ["kb_support", "kb_people", "kb_all", "kb_eng", "kb_lending", "kb_legal"] as const
const day = (v: string) => new Date(v).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
const sum = (rows: SeriesPoint[], key: string) => rows.reduce((n, r) => n + (Number(r[key]) || 0), 0)

function ChartEmpty() {
  return <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">No activity in this range. Pick a wider range to see the trend.</div>
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <StatSkeleton />
      <Skeleton className="h-[280px] w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

/** A ranked list with a share bar per row, for categorical breakdowns where a chart adds nothing. */
function ShareRows({ rows, empty }: { rows: { key: string; label: React.ReactNode; value: number; hint?: string; href?: string }[]; empty: string }) {
  const total = rows.reduce((n, r) => n + r.value, 0)
  if (!rows.length || total === 0) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
  return (
    <Rows>
      {rows.map((r) => (
        <Row
          key={r.key}
          href={r.href}
          title={r.label}
          description={
            <span className="mt-1 flex items-center gap-2">
              <Progress value={(r.value / total) * 100} className="h-1.5 max-w-[240px] flex-1" />
              <span className="tabular-nums">{pct(r.value / total)}</span>
              {r.hint && <span className="truncate">· {r.hint}</span>}
            </span>
          }
          trailing={<span className="tabular-nums">{num(r.value)}</span>}
        />
      ))}
    </Rows>
  )
}

export function AnalyticsPage() {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { base } = useWs()
  const analytics = useMock((s) => s.analytics)
  const kbs = useMock((s) => s.kbs)
  const tools = useMock((s) => s.tools)
  const tokens = useMock((s) => s.mcpTokens)
  const oauthClients = useMock((s) => s.oauthClients)
  const rawRange = params.get("range")
  const range = (rawRange && rawRange in RANGES ? rawRange : "30d") as Range
  const [custom, setCustom] = useState<DateRange | undefined>()
  const tab = params.get("tab") ?? "knowledge"

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString())
    p.set(k, v)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  const slice = useMemo(() => {
    return (rows: SeriesPoint[]) => {
      if (state === "empty") return []
      if (custom?.from) {
        const from = custom.from.toISOString().slice(0, 10)
        const to = (custom.to ?? custom.from).toISOString().slice(0, 10)
        return rows.filter((r) => r.date >= from && r.date <= to)
      }
      return rows.slice(-RANGES[range])
    }
  }, [range, custom, state])

  const queries = slice(analytics.queriesPerDay)
  const perKb = slice(analytics.queriesPerKb)
  const execs = slice(analytics.executionsPerDay)
  const days = queries.length
  const scale = days / 30

  const totalQ = sum(queries, "queries")
  const noAns = sum(queries, "noAnswer")
  const activeKbs = KB_KEYS.filter((k) => sum(perKb, k) > 0).length
  const medianLatency = kbs.length ? [...kbs].map((k) => k.stats.medianLatencyMs).sort((a, b) => a - b)[Math.floor(kbs.length / 2)] : 0
  const totalExec = sum(execs, "success") + sum(execs, "failed")
  const failedExec = sum(execs, "failed")
  const topTools = analytics.topTools.map((t) => ({ ...t, executions: Math.round(t.executions * scale) }))
  const toolTotal = topTools.reduce((n, t) => n + t.executions, 0)
  const medianTool = topTools.length ? [...topTools].map((t) => t.medianMs).sort((a, b) => a - b)[Math.floor(topTools.length / 2)] : 0

  const kbConfig = Object.fromEntries(
    KB_KEYS.map((id) => {
      const k = kbs.find((x) => x.id === id)
      return [id, { label: k?.name ?? id, color: `var(--color-${k?.color ?? "slate"}-500)` }]
    })
  ) satisfies ChartConfig
  const execConfig = { success: { label: "Succeeded", color: "var(--chart-2)" }, failed: { label: "Failed", color: "var(--destructive)" } } satisfies ChartConfig

  const exportCsv = (what: string) => toast.success(`Exporting ${what} as CSV`, { description: custom?.from ? "Custom range" : `Last ${range}` })
  const rangeLabel = custom?.from ? "custom range" : range === "24h" ? "last 24 hours" : `last ${RANGES[range]} days`

  const axis = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="0" />
      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={day} />
      <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
    </>
  )

  const body = (children: React.ReactNode) => (state === "loading" ? <TabSkeleton /> : state === "error" ? <ErrorState title="Analytics did not load" message="The analytics service did not respond. The numbers are still being collected; retrying usually works." onRetry={() => router.replace(pathname)} /> : children)

  return (
    <AdminOnly>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Analytics"
          description="Workspace-wide usage across knowledge and tools, by caller and by client."
          actions={
            <>
              <ToggleGroup type="single" value={custom?.from ? "" : range} onValueChange={(v) => { if (v) { setCustom(undefined); setParam("range", v) } }} variant="outline" size="sm">
                {(Object.keys(RANGES) as Range[]).map((r) => (
                  <ToggleGroupItem key={r} value={r} className="h-8 px-2.5 text-xs">{r}</ToggleGroupItem>
                ))}
              </ToggleGroup>
              <DateRangePicker value={custom} onChange={setCustom} placeholder="Custom range" className="[&_button]:h-8 [&_button]:text-xs" />
            </>
          }
        />
        <Tabs value={tab} onValueChange={(v) => setParam("tab", v)} className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>
            <Button size="sm" variant="outline" onClick={() => exportCsv(tab)}><Download className="size-4" /> Export CSV</Button>
          </div>

          <TabsContent value="knowledge" className="space-y-4">
            {body(
              <>
                <StatRow>
                  <StatTile label="Queries" value={num(totalQ)} hint={rangeLabel} />
                  <StatTile label="No-answer rate" value={totalQ ? pct(noAns / totalQ, 1) : "—"} tone={totalQ && noAns / totalQ > 0.1 ? "warn" : "default"} hint={`${num(noAns)} unanswered`} />
                  <StatTile label="Median latency" value={ms(medianLatency)} hint="Retrieval and synthesis" />
                  <StatTile label="Active knowledge bases" value={`${activeKbs} of ${kbs.length}`} hint="Queried at least once" />
                </StatRow>
                <Section title="Queries per day by knowledge base" description="Every channel: app, API, MCP and public links.">
                  {totalQ === 0 ? (
                    <ChartEmpty />
                  ) : (
                    <ChartContainer config={kbConfig} className="aspect-auto h-[260px] w-full">
                      <BarChart data={perKb} margin={{ left: 0, right: 0 }}>
                        {axis}
                        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => day(String(v))} />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {KB_KEYS.map((k, i) => (
                          <Bar key={k} dataKey={k} stackId="q" fill={`var(--color-${k})`} radius={i === KB_KEYS.length - 1 ? [3, 3, 0, 0] : 0} />
                        ))}
                      </BarChart>
                    </ChartContainer>
                  )}
                </Section>
                <Section title="Knowledge bases" flush>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Knowledge base</TableHead>
                          <TableHead className="text-right">Queries</TableHead>
                          <TableHead className="text-right">No-answer rate</TableHead>
                          <TableHead className="text-right">Median latency</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kbs
                          .map((k) => ({ k, q: sum(perKb, k.id) }))
                          .sort((a, b) => b.q - a.q)
                          .map(({ k, q }) => (
                            <TableRow key={k.id} className="cursor-pointer" onClick={() => router.push(`${base}/kb/${k.id}/analytics`)}>
                              <TableCell><span className="flex items-center gap-2 font-medium"><KbDot color={k.color} /> {k.name}</span></TableCell>
                              <TableCell className="text-right tabular-nums">{num(q)}</TableCell>
                              <TableCell className="text-right tabular-nums">{pct(k.stats.noAnswerRate, 1)}</TableCell>
                              <TableCell className="text-right tabular-nums">{ms(k.stats.medianLatencyMs)}</TableCell>
                              <TableCell className="text-right">
                                <Link href={`${base}/kb/${k.id}/analytics`} aria-label={`${k.name} analytics`} onClick={(e) => e.stopPropagation()} className="inline-flex text-muted-foreground hover:text-foreground"><ArrowUpRight className="size-4" /></Link>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </Section>
              </>
            )}
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            {body(
              <>
                <StatRow>
                  <StatTile label="Executions" value={num(totalExec)} hint={rangeLabel} />
                  <StatTile label="Success rate" value={totalExec ? pct(1 - failedExec / totalExec, 1) : "—"} tone={totalExec && failedExec / totalExec > 0.05 ? "warn" : "good"} hint={`${num(failedExec)} failed`} />
                  <StatTile label="Median duration" value={ms(medianTool)} hint="Across the top tools" />
                  <StatTile label="Active tools" value={`${tools.filter((t) => t.status === "active").length} of ${tools.length}`} hint="Status active" />
                </StatRow>
                <Section title="Executions and errors per day">
                  {totalExec === 0 ? (
                    <ChartEmpty />
                  ) : (
                    <ChartContainer config={execConfig} className="aspect-auto h-[240px] w-full">
                      <BarChart data={execs} margin={{ left: 0, right: 0 }}>
                        {axis}
                        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => day(String(v))} />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="success" stackId="e" fill="var(--color-success)" />
                        <Bar dataKey="failed" stackId="e" fill="var(--color-failed)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </Section>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Section title="Top tools" flush>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Tool</TableHead>
                            <TableHead className="text-right">Executions</TableHead>
                            <TableHead className="text-right">Success</TableHead>
                            <TableHead className="text-right">Median</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topTools.map((t) => (
                            <TableRow key={t.toolId} className="cursor-pointer" onClick={() => router.push(`${base}/tools/${t.toolId}/general`)}>
                              <TableCell>
                                <div className="min-w-[160px] space-y-1">
                                  <span className="font-medium">{t.name}</span>
                                  <Progress value={toolTotal ? (t.executions / toolTotal) * 100 : 0} className="h-1.5" aria-label={`${t.name} share of executions`} />
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{num(t.executions)}</TableCell>
                              <TableCell className="text-right tabular-nums">{pct(t.successRate, 1)}</TableCell>
                              <TableCell className="text-right tabular-nums">{ms(t.medianMs)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Section>
                  <Section title="Recent failures" flush>
                    {state === "empty" ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">No failed executions in this range.</p>
                    ) : (
                      <Rows>
                        {analytics.recentFailures.map((f) => (
                          <Row
                            key={f.executionId}
                            href={`${base}/executions/${f.executionId}`}
                            leading={<AlertTriangle className="size-4 text-destructive" />}
                            title={f.toolName}
                            description={f.message}
                            trailing={<span className="text-xs text-muted-foreground">{relative(f.at)}</span>}
                          />
                        ))}
                      </Rows>
                    )}
                  </Section>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            {body(
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Requests by channel" flush>
                  <ShareRows empty="No requests in this range." rows={state === "empty" ? [] : [...analytics.clientsByChannel].sort((a, b) => b.requests - a.requests).map((c) => ({ key: c.channel, label: c.channel, value: Math.round(c.requests * scale) }))} />
                </Section>
                <Section title="Requests by MCP client" description="Client name reported during the MCP handshake." flush>
                  <ShareRows empty="No MCP requests in this range." rows={state === "empty" ? [] : [...analytics.clientsByName].sort((a, b) => b.requests - a.requests).map((c) => ({ key: c.name, label: <span className="font-mono text-xs">{c.name}</span>, value: Math.round(c.requests * scale) }))} />
                </Section>
                <Section title="MCP tokens by last use" flush>
                  {state === "empty" || tokens.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">No tokens have been used.</p>
                  ) : (
                    <Rows>
                      {[...tokens].sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "")).slice(0, 8).map((t) => (
                        <Row key={t.id} href={`${base}/connect/mcp`} title={t.name} description={<span className="font-mono">{t.prefix}</span>} trailing={<span className="text-xs text-muted-foreground">{t.lastUsedAt ? relative(t.lastUsedAt) : "Never used"}</span>} />
                      ))}
                    </Rows>
                  )}
                </Section>
                <Section title="OAuth clients by users authorised" flush>
                  <ShareRows empty="No OAuth clients have been authorised." rows={state === "empty" ? [] : [...oauthClients].sort((a, b) => b.usersAuthorised - a.usersAuthorised).map((c) => ({ key: c.id, label: c.name, value: c.usersAuthorised, hint: c.clientId, href: `${base}/connect/oauth-clients` }))} />
                </Section>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminOnly>
  )
}
