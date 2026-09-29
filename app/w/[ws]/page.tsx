"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Database, Plug, FolderOpen, MessagesSquare, AlertTriangle, Clock, HardDrive, KeyRound, FileCheck2, CheckCircle2, Plus, Upload } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { PageHeader } from "@/components/shared/page-header"
import { StatTile, StatRow } from "@/components/shared/stat-tile"
import { Section, Rows, Row } from "@/components/shared/surface"
import { EmptyState, PageStateGate, StatSkeleton } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, pct, relative, bytes, daysUntil } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = { queries: { label: "Queries", color: "var(--chart-1)" }, noAnswer: { label: "No answer", color: "var(--chart-5)" } } satisfies ChartConfig

export default function HomePage() {
  const state = usePageState()
  const router = useRouter()
  const { base, workspace } = useWs()
  const { admin } = useRole()
  const kbs = useMock((s) => s.kbs)
  const sources = useMock((s) => s.sources)
  const executions = useMock((s) => s.executions)
  const tokens = useMock((s) => s.mcpTokens)
  const secrets = useMock((s) => s.secrets)
  const proposals = useMock((s) => s.proposals)
  const audit = useMock((s) => s.audit)
  const curation = useMock((s) => s.curation)
  const analytics = useMock((s) => s.analytics)
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")

  const series = useMemo(() => analytics.queriesPerDay.slice(range === "7d" ? -7 : range === "30d" ? -30 : -90), [analytics, range])
  const queries7d = kbs.reduce((n, k) => n + k.stats.queries7d, 0)
  const exec7d = executions.length
  const execOk = executions.filter((e) => e.status === "success").length
  const failedSources = sources.filter((s) => s.lastRunStatus === "failed" || s.status === "revoked")
  const staleTotal = kbs.reduce((n, k) => n + k.stats.stale, 0)
  const quotaPct = workspace.storageUsedBytes / workspace.storageQuotaBytes
  const expiringTokens = tokens.filter((t) => t.status === "active" && t.expiresAt && (daysUntil(t.expiresAt) ?? 99) <= 7)
  const expiringSecrets = secrets.filter((t) => t.isActive && t.expiresAt && (daysUntil(t.expiresAt) ?? 99) <= 7)
  const pending = proposals.filter((p) => p.status === "pending")
  const openCuration = curation.filter((c) => c.status === "open")

  const attention: { key: string; tone: "bad" | "warn" | "info"; label: string; detail: string; href: string; adminOnly?: boolean }[] = []
  failedSources.forEach((s) => attention.push({ key: s.id, tone: "bad", label: `${s.name} failed to sync`, detail: s.status === "revoked" ? "Connection revoked; reconnect to resume" : "Open the last run to see why", href: `${base}/sources/${s.id}/history`, adminOnly: true }))
  if (staleTotal > 0) attention.push({ key: "stale", tone: "warn", label: `${num(staleTotal)} documents past their review-by date`, detail: "Across all knowledge bases", href: `${base}/kb/kb_people/documents?freshness=stale` })
  if (quotaPct > 0.8) attention.push({ key: "quota", tone: "warn", label: `Storage at ${pct(quotaPct)}`, detail: `${bytes(workspace.storageUsedBytes)} of ${bytes(workspace.storageQuotaBytes)}`, href: `${base}/files/storage`, adminOnly: true })
  expiringTokens.forEach((t) => attention.push({ key: t.id, tone: "warn", label: `Token "${t.name}" expires in ${daysUntil(t.expiresAt)} days`, detail: `Created by ${t.createdBy}`, href: `${base}/connect/mcp`, adminOnly: true }))
  expiringSecrets.forEach((t) => attention.push({ key: t.id, tone: "warn", label: `Secret ${t.name} expires in ${daysUntil(t.expiresAt)} days`, detail: `Used by ${t.usedByToolIds.length} tool${t.usedByToolIds.length === 1 ? "" : "s"}`, href: `${base}/secrets`, adminOnly: true }))
  if (pending.length) attention.push({ key: "proposals", tone: "info", label: `${pending.length} proposals awaiting review`, detail: pending.map((p) => p.documentTitle).filter((v, i, a) => a.indexOf(v) === i).join(", "), href: `${base}/kb/${pending[0].kbId}/proposals` })
  if (openCuration.length) attention.push({ key: "curation", tone: "info", label: `${openCuration.length} curation items open`, detail: "Stale, conflicting and unanswered questions", href: `${base}/kb/kb_people/curation`, adminOnly: true })
  const visibleAttention = attention.filter((a) => admin || !a.adminOnly)

  const isEmpty = state === "empty" || kbs.length === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Good afternoon, ${useMock.getState().user.name.split(" ")[0]}`}
        description={isEmpty ? "Get your first knowledge base answering questions." : "Whether the workspace is healthy, and what needs attention."}
        actions={
          !isEmpty && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push(`${base}/chat`)}>
                <MessagesSquare className="size-4" /> Open chat
              </Button>
              {admin && (
                <Button size="sm" onClick={() => router.push(`${base}/kb/new`)}>
                  <Plus className="size-4" /> New knowledge base
                </Button>
              )}
            </>
          )
        }
      />

      <PageStateGate state={state} loading={<><StatSkeleton /><Skeleton className="h-64 w-full" /></>}>
        {isEmpty ? (
          <Section flush>
            <EmptyState
              icon={Database}
              title="Nothing to answer from yet"
              description="A knowledge base is a searchable index built from one or more sources. Add a source, put it in a knowledge base, and the workspace assistant starts answering from it."
              action={{ label: "Add a source", href: `${base}/sources/new` }}
              secondaryAction={{ label: "Upload files", href: `${base}/files?upload=1` }}
            />
          </Section>
        ) : (
          <>
            <StatRow>
              <StatTile label="Knowledge bases" value={kbs.length} hint={`${num(kbs.reduce((n, k) => n + k.stats.documents, 0))} indexed documents`} href={`${base}/kb`} />
              <StatTile label="Sources" value={sources.length} hint={failedSources.length ? `${failedSources.length} failed` : "All syncing"} tone={failedSources.length ? "bad" : "default"} href={admin ? `${base}/sources` : undefined} />
              <StatTile label="Queries · 7 days" value={num(queries7d)} hint="+9% on the previous week" href={admin ? `${base}/analytics` : undefined} />
              <StatTile label="Tool executions · 7 days" value={num(exec7d)} hint={`${pct(execOk / Math.max(exec7d, 1))} success`} href={`${base}/executions`} />
            </StatRow>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="Needs attention" description={visibleAttention.length ? `${visibleAttention.length} item${visibleAttention.length === 1 ? "" : "s"}` : undefined} flush>
                {visibleAttention.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600" /> All clear. Nothing is failing, stale or expiring.
                  </div>
                ) : (
                  <Rows>
                    {visibleAttention.slice(0, 7).map((a) => (
                      <Row
                        key={a.key}
                        href={a.href}
                        leading={a.tone === "bad" ? <AlertTriangle className="size-4 text-destructive" /> : a.tone === "warn" ? <Clock className="size-4 text-amber-500" /> : <FileCheck2 className="size-4 text-blue-500" />}
                        title={a.label}
                        description={a.detail}
                        trailing={<Badge variant="outline" className="font-normal">{a.tone === "bad" ? "Failed" : a.tone === "warn" ? "Expiring" : "Review"}</Badge>}
                      />
                    ))}
                  </Rows>
                )}
              </Section>
              <Section title="Recent activity" flush>
                <Rows>
                  {audit.slice(0, 7).map((e) => (
                    <Row
                      key={e.id}
                      title={
                        <span>
                          <span className="font-medium">{e.actor.name}</span> <span className="font-normal text-muted-foreground">{e.action.replace(/_/g, " ")}</span> {e.resource.name}
                        </span>
                      }
                      description={`${e.resource.type.replace(/_/g, " ")} · ${relative(e.at)}`}
                      trailing={e.status === "failed" ? <Badge variant="destructive" className="font-normal">Failed</Badge> : undefined}
                    />
                  ))}
                </Rows>
                {admin && (
                  <div className="border-t px-4 py-2 text-xs">
                    <Link href={`${base}/audit`} className="text-muted-foreground hover:text-foreground">View audit log</Link>
                  </div>
                )}
              </Section>
            </div>

            <Section
              title="Queries per day"
              description="Across every knowledge base, with the share that returned no answer."
              actions={
                <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as typeof range)} variant="outline" size="sm">
                  <ToggleGroupItem value="7d" className="h-7 px-2 text-xs">7d</ToggleGroupItem>
                  <ToggleGroupItem value="30d" className="h-7 px-2 text-xs">30d</ToggleGroupItem>
                  <ToggleGroupItem value="90d" className="h-7 px-2 text-xs">90d</ToggleGroupItem>
                </ToggleGroup>
              }
            >
              <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                <BarChart data={series} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} />
                  <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => new Date(String(v)).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })} />} />
                  <Bar dataKey="queries" fill="var(--color-queries)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="noAnswer" fill="var(--color-noAnswer)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Section>

            <div className="flex flex-wrap gap-2">
              {admin && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${base}/sources/new`}><Plug className="size-4" /> Add source</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`${base}/files?upload=1`}><Upload className="size-4" /> Upload files</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`${base}/files`}><FolderOpen className="size-4" /> Files</Link>
              </Button>
              {admin && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${base}/files/storage`}><HardDrive className="size-4" /> Storage</Link>
                </Button>
              )}
              {admin && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${base}/connect/mcp`}><KeyRound className="size-4" /> MCP tokens</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </PageStateGate>
    </div>
  )
}
