"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Clock, GitCompareArrows, HelpCircle, Check, X, Play, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Section, Rows, Row } from "@/components/shared/surface"
import { StatTile, StatRow } from "@/components/shared/stat-tile"
import { EmptyState, PageStateGate, StatSkeleton } from "@/components/shared/states"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { relative } from "@/lib/format"
import type { CurationIssue } from "@/lib/mock/types"

const KIND: Record<CurationIssue["kind"], { label: string; icon: typeof Clock; tone: string; verb: string }> = {
  stale: { label: "Stale", icon: Clock, tone: "text-amber-500", verb: "Mark reviewed" },
  conflict: { label: "Conflicting", icon: GitCompareArrows, tone: "text-rose-500", verb: "Resolve" },
  unanswered: { label: "Unanswered", icon: HelpCircle, tone: "text-blue-500", verb: "Answered" },
}

export default function KbCurationPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { base } = useWs()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const issues = useMock((s) => s.curation).filter((c) => c.kbId === kb.id)
  const setStatus = useMock((s) => s.setCurationStatus)
  const excludeItem = useMock((s) => s.excludeItem)
  const verifyItem = useMock((s) => s.verifyItem)
  const [tab, setTab] = useState<"open" | "resolved">("open")
  const [kind, setKind] = useState<"all" | CurationIssue["kind"]>("all")

  const list = useMemo(() => (state === "empty" ? [] : issues.filter((i) => (tab === "open" ? i.status === "open" : i.status !== "open")).filter((i) => kind === "all" || i.kind === kind)), [issues, tab, kind, state])
  const open = issues.filter((i) => i.status === "open")
  const owners = Array.from(new Set(open.map((i) => i.ownerName)))
  const root = `${base}/kb/${kb.id}`

  return (
    <AdminOnly>
      <PageStateGate state={state} loading={<StatSkeleton n={3} />}>
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl text-sm text-muted-foreground">The knowledge owner's queue: documents past their review date, documents that disagree, and questions nothing answered. Reviewed monthly by the owner named on each item.</p>
          <StatRow className="lg:grid-cols-3">
            <StatTile label="Stale" value={open.filter((i) => i.kind === "stale").reduce((n, i) => n + (i.count ?? 1), 0)} tone="warn" hint="documents past review-by" href={`${root}/documents?freshness=stale`} />
            <StatTile label="Conflicting" value={open.filter((i) => i.kind === "conflict").length} tone={open.some((i) => i.kind === "conflict") ? "bad" : "default"} hint="documents that disagree" />
            <StatTile label="Unanswered" value={open.filter((i) => i.kind === "unanswered").reduce((n, i) => n + (i.count ?? 1), 0)} hint="questions with no answer" href={`${root}/analytics`} />
          </StatRow>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList><TabsTrigger value="open">Open {open.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 font-normal">{open.length}</Badge>}</TabsTrigger><TabsTrigger value="resolved">Resolved</TabsTrigger></TabsList>
            </Tabs>
            <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <TabsList className="h-8"><TabsTrigger value="all" className="h-7 text-xs">All</TabsTrigger><TabsTrigger value="stale" className="h-7 text-xs">Stale</TabsTrigger><TabsTrigger value="conflict" className="h-7 text-xs">Conflicting</TabsTrigger><TabsTrigger value="unanswered" className="h-7 text-xs">Unanswered</TabsTrigger></TabsList>
            </Tabs>
          </div>
          {list.length === 0 ? (
            <div className="rounded-lg border"><EmptyState icon={ClipboardList} title={tab === "open" ? "Nothing to curate" : "Nothing resolved yet"} description="Curation items appear when a document passes its review-by date, two documents score on the same question with different answers, or a question gets no answer more than five times." action={{ label: "Open analytics", href: `${root}/analytics` }} /></div>
          ) : (
            <Section flush title={tab === "open" ? `Open · ${owners.length} owner${owners.length === 1 ? "" : "s"}` : "Resolved"}>
              <Rows>
                {list.map((i) => {
                  const k = KIND[i.kind]
                  return (
                    <li key={i.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
                      <k.icon className={`mt-0.5 size-4 shrink-0 ${k.tone}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{i.title}</span>
                          <Badge variant="outline" className="font-normal">{k.label}</Badge>
                          {i.count && <Badge variant="secondary" className="font-normal tabular-nums">{i.count}</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{i.detail}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Owner {i.ownerName}</span>
                          <span>First seen {relative(i.firstSeen)}</span>
                          {i.documentIds.slice(0, 2).map((d) => <Link key={d} href={`${root}/documents?doc=${d}`} className="underline underline-offset-4 hover:text-foreground">Open document</Link>)}
                        </div>
                      </div>
                      {i.status === "open" ? (
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {i.kind === "unanswered" && <Button asChild variant="outline" size="sm" className="h-7"><Link href={`${root}/playground?q=${encodeURIComponent(i.title.replace(/^"([^"]+)".*$/, "$1"))}`}><Play className="size-3.5" /> Ask</Link></Button>}
                          {i.kind === "conflict" && i.documentIds.length > 1 && <Button variant="outline" size="sm" className="h-7" onClick={() => { excludeItem(i.documentIds[i.documentIds.length - 1]); setStatus(i.id, "resolved"); toast.success("Older version excluded from retrieval") }}>Exclude older</Button>}
                          {i.kind === "stale" && i.documentIds.length === 1 && <Button variant="outline" size="sm" className="h-7" onClick={() => { verifyItem(i.documentIds[0], true); setStatus(i.id, "resolved"); toast.success("Marked reviewed", { description: "Review-by moved 90 days out." }) }}><Check className="size-3.5" /> {k.verb}</Button>}
                          {!(i.kind === "stale" && i.documentIds.length === 1) && <Button variant="outline" size="sm" className="h-7" onClick={() => { setStatus(i.id, "resolved"); toast.success("Resolved") }}><Check className="size-3.5" /> Resolve</Button>}
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => { setStatus(i.id, "dismissed"); toast.message("Dismissed") }}><X className="size-3.5" /> Dismiss</Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 font-normal capitalize">{i.status}</Badge>
                      )}
                    </li>
                  )
                })}
              </Rows>
            </Section>
          )}
        </div>
      </PageStateGate>
    </AdminOnly>
  )
}
