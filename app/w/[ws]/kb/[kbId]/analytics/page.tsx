"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Download, Play, BarChart3 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatTile, StatRow } from "@/components/shared/stat-tile"
import { Section } from "@/components/shared/surface"
import { EmptyState, PageStateGate, StatSkeleton } from "@/components/shared/states"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { ms, num, pct, relative } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"

const cfg = { queries: { label: "Queries", color: "var(--chart-2)" }, noAnswer: { label: "No answer", color: "var(--chart-3)" } } satisfies ChartConfig
const callerCfg = { members: { label: "Members", color: "var(--chart-1)" }, api: { label: "API keys", color: "var(--chart-2)" }, mcp: { label: "MCP", color: "var(--chart-3)" }, public: { label: "Public link", color: "var(--chart-4)" } } satisfies ChartConfig

export default function KbAnalyticsPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { base } = useWs()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const analytics = useMock((s) => s.analytics)
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d">("7d")
  const n = range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90
  const share = kb.id === "kb_support" ? 0.5 : kb.id === "kb_people" ? 0.16 : kb.id === "kb_all" ? 0.2 : kb.id === "kb_eng" ? 0.08 : kb.id === "kb_lending" ? 0.05 : 0.01
  const series = useMemo(() => analytics.queriesPerDay.slice(-n).map((p) => ({ date: p.date, queries: Math.round((p.queries as number) * share), noAnswer: Math.round((p.noAnswer as number) * share) })), [analytics, n, share])
  const callers = useMemo(() => analytics.queriesByCaller.slice(-n).map((p) => ({ date: p.date, members: Math.round((p.members as number) * share), api: Math.round((p.api as number) * share), mcp: Math.round((p.mcp as number) * share), public: Math.round((p.public as number) * share) })), [analytics, n, share])
  const total = series.reduce((a, p) => a + p.queries, 0)
  const noAns = series.reduce((a, p) => a + p.noAnswer, 0)
  const isEmpty = state === "empty" || total === 0
  const maxDoc = Math.max(...analytics.topDocuments.map((d) => d.citations), 1)
  const root = `${base}/kb/${kb.id}`

  return (
    <AdminOnly>
      <PageStateGate state={state} loading={<><StatSkeleton /><Skeleton className="h-64" /></>}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as typeof range)} variant="outline" size="sm">
              {(["24h", "7d", "30d", "90d"] as const).map((r) => <ToggleGroupItem key={r} value={r} className="h-8 px-3 text-xs">{r}</ToggleGroupItem>)}
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={() => toast.success("Export started", { description: "CSV will download when ready." })}><Download className="size-3.5" /> Export CSV</Button>
          </div>
          {isEmpty ? (
            <div className="rounded-lg border">
              <EmptyState icon={BarChart3} title="No queries in this range" description="Analytics fill in as people and clients query this knowledge base. Ask something in the playground, or hand a developer the API tab." action={{ label: "Open playground", href: `${root}/playground` }} secondaryAction={{ label: "Query API", href: `${root}/api` }} />
            </div>
          ) : (
            <>
              <StatRow>
                <StatTile label="Queries" value={num(total)} hint={`${range} · ${num(Math.round(total / n))} per day`} />
                <StatTile label="No-answer rate" value={pct(noAns / Math.max(total, 1), 1)} tone={noAns / total > 0.1 ? "warn" : "default"} hint={`${num(noAns)} unanswered`} />
                <StatTile label="Median latency" value={ms(kb.stats.medianLatencyMs)} hint="retrieval + synthesis" />
                <StatTile label="Distinct callers" value={num(Math.round(12 + total / 90))} hint="members, keys, tokens and public sessions" />
              </StatRow>
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Queries per day" description="With the share that returned no answer.">
                  <ChartContainer config={cfg} className="aspect-auto h-[220px] w-full">
                    <BarChart data={series}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} />
                      <YAxis tickLine={false} axisLine={false} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="queries" fill="var(--color-queries)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="noAnswer" fill="var(--color-noAnswer)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </Section>
                <Section title="Queries by caller type" description="Who is asking.">
                  <ChartContainer config={callerCfg} className="aspect-auto h-[220px] w-full">
                    <LineChart data={callers}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} />
                      <YAxis tickLine={false} axisLine={false} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {(["members", "api", "mcp", "public"] as const).map((k) => <Line key={k} type="monotone" dataKey={k} stroke={`var(--color-${k})`} strokeWidth={2} dot={false} />)}
                    </LineChart>
                  </ChartContainer>
                </Section>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Top documents" description="Which documents carry the load." flush>
                  <ul className="divide-y">
                    {analytics.topDocuments.slice(0, 6).map((d) => (
                      <li key={d.documentId} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <Link href={`${root}/documents?doc=${d.documentId}`} className="min-w-0 flex-1 truncate hover:underline">{d.title}</Link>
                        <div className="hidden w-32 sm:block"><Progress value={(d.citations / maxDoc) * 100} className="h-1.5" /></div>
                        <span className="w-16 text-right tabular-nums">{num(d.citations)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t px-4 py-1.5 text-[11px] text-muted-foreground">citations in range</div>
                </Section>
                <Section title="Top queries" flush>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Query</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">No answer</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {analytics.topQueries.map((q) => (
                          <TableRow key={q.query}><TableCell className="max-w-[260px] truncate">{q.query}</TableCell><TableCell className="text-right tabular-nums">{num(q.count)}</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">{pct(q.noAnswerShare)}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Section>
              </div>
              <Section title="No-answer queries" description="What people asked that nothing answered. Each one is also a curation item." flush>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Query</TableHead><TableHead className="text-right">Count</TableHead><TableHead>Last seen</TableHead><TableHead /></TableRow></TableHeader>
                    <TableBody>
                      {analytics.noAnswerQueries.map((q) => (
                        <TableRow key={q.query}>
                          <TableCell>{q.query}</TableCell>
                          <TableCell className="text-right tabular-nums">{num(q.count)}</TableCell>
                          <TableCell className="text-muted-foreground">{relative(q.lastSeen)}</TableCell>
                          <TableCell className="text-right"><Button asChild variant="ghost" size="sm" className="h-7"><Link href={`${root}/playground?q=${encodeURIComponent(q.query)}`}><Play className="size-3.5" /> Ask in playground</Link></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Section>
            </>
          )}
        </div>
      </PageStateGate>
    </AdminOnly>
  )
}
