"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Play, RotateCcw, Plus, Trash2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RetrievalForm } from "@/components/knowledge/retrieval-form"
import { Section, FieldRow } from "@/components/shared/surface"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { PageStateGate, FormSkeleton } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { retrievalPresets } from "@/lib/mock/seed/kbs"
import { models } from "@/lib/mock/seed/settings"
import { DRAFT_KEY } from "@/lib/mock/playground-draft"
import type { PrecedenceRule, RetrievalSettings } from "@/lib/mock/types"

export default function KbRetrievalPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const sources = useMock((s) => s.sources).filter((x) => kb.sources.some((l) => l.sourceId === x.id))
  const items = useMock((s) => s.items)
  const settingsWs = useMock((s) => s.settings)
  const updateRetrieval = useMock((s) => s.updateRetrieval)
  const updateKb = useMock((s) => s.updateKb)
  const [draft, setDraft] = useState<RetrievalSettings>(kb.retrieval)
  const [precedence, setPrecedence] = useState<PrecedenceRule[]>(kb.precedence)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => { setDraft(kb.retrieval); setPrecedence(kb.precedence) }, [kb.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(draft) !== JSON.stringify(kb.retrieval) || JSON.stringify(precedence) !== JSON.stringify(kb.precedence)
  const metadataKeys = useMemo(() => Array.from(new Set(items.filter((i) => kb.sources.some((l) => l.sourceId === i.sourceId)).flatMap((i) => Object.keys(i.metadata)))), [items, kb.sources])

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault() } }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  const save = () => {
    updateRetrieval(kb.id, draft)
    updateKb(kb.id, { precedence })
    toast.success("Retrieval settings saved", { description: "Takes effect on the next query; stored chunks are unchanged." })
  }

  const testInPlayground = () => {
    try { sessionStorage.setItem(DRAFT_KEY(kb.id), JSON.stringify(draft)) } catch {}
    router.push(`${base}/kb/${kb.id}/playground`)
  }

  const modelLabel = models.find((m) => m.id === draft.model)?.label ?? draft.model

  return (
    <PageStateGate state={state} loading={<FormSkeleton fields={8} />}>
      {!settingsWs.security.sendTextToProviders && (
        <Alert>
          <AlertTitle>Answer synthesis is disabled workspace-wide</AlertTitle>
          <AlertDescription>Security settings block sending document text to model providers. Queries return chunks only until an owner turns it back on.</AlertDescription>
        </Alert>
      )}
      {!admin && <Alert className="mb-2"><AlertDescription>You can see these settings but only an admin can change them.</AlertDescription></Alert>}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <RetrievalForm value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} sources={sources} metadataKeys={metadataKeys} variant="full" disabled={!admin} />
          <Section title="Precedence" description="When two documents disagree, the higher rule wins and the answer says which document it followed." className="scroll-mt-24">
            <div id="precedence" className="space-y-2">
              {precedence.map((p, i) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <Input className="h-8 min-w-[160px] flex-1" value={p.label} onChange={(e) => setPrecedence(precedence.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} disabled={!admin} />
                  <Input className="h-8 w-36" value={p.winner} onChange={(e) => setPrecedence(precedence.map((x, j) => (j === i ? { ...x, winner: e.target.value } : x)))} disabled={!admin} placeholder="Winner" />
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  <Input className="h-8 w-36" value={p.loser} onChange={(e) => setPrecedence(precedence.map((x, j) => (j === i ? { ...x, loser: e.target.value } : x)))} disabled={!admin} placeholder="Loser" />
                  {admin && <Button variant="ghost" size="icon" className="size-8" onClick={() => setPrecedence(precedence.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
                </div>
              ))}
              {admin && <Button variant="outline" size="sm" className="h-7" onClick={() => setPrecedence([...precedence, { id: `p${Date.now()}`, label: "", winner: "", loser: "" }])}><Plus className="size-3.5" /> Add rule</Button>}
            </div>
          </Section>
        </div>
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Section title="Effective settings" description="What a query gets right now." bodyClassName="px-4 py-1">
            <FieldRow label="Mode" value={draft.searchMode} />
            <FieldRow label="Rerank" value={draft.rerank ? `on · ${draft.reranker}` : "off"} />
            <FieldRow label="Chunks" value={String(draft.chunkLimit)} />
            <FieldRow label="Threshold" value={draft.threshold.toFixed(2)} />
            <FieldRow label="Synthesis" value={draft.synthesis ? `on · ${modelLabel}` : "off"} />
            <FieldRow label="Temperature" value={draft.synthesis ? String(draft.temperature) : "—"} />
            <FieldRow label="Citations" value={draft.citationStyle} />
            <FieldRow label="Tables" value={draft.structuredTables ? "structured values" : "prose"} />
            <FieldRow label="Filters" value={draft.defaultFilters.length ? draft.defaultFilters.map((f) => `${f.key} ${f.op} ${f.value}`).join("; ") : "none"} wrap />
            <FieldRow label="Scope" value={draft.scopeSourceIds.length ? `${draft.scopeSourceIds.length} sources` : "all sources"} />
          </Section>
          {admin && (
            <Section title="Reset to preset">
              <div className="flex flex-wrap gap-2">
                {(["balanced", "precise", "raw"] as const).map((p) => (
                  <Button key={p} variant="outline" size="sm" className="capitalize" onClick={() => { setDraft((d) => ({ ...d, ...retrievalPresets[p] })); toast.message(`Preset ${p} applied`, { description: "Save to keep it." }) }}>{p}</Button>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {admin && dirty && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft(kb.retrieval); setPrecedence(kb.precedence) }}><RotateCcw className="size-3.5" /> Discard</Button>
            <Button variant="outline" size="sm" onClick={testInPlayground}><Play className="size-3.5" /> Test in playground</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
      )}
      {admin && !dirty && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={testInPlayground}><Play className="size-3.5" /> Test in playground</Button>
        </div>
      )}
      <ConfirmDialog open={leaveOpen} onOpenChange={setLeaveOpen} title="Discard unsaved changes?" description="Your retrieval changes have not been saved." confirmLabel="Discard" destructive onConfirm={() => { setLeaveOpen(false); if (pendingHref) router.push(pendingHref) }} />
    </PageStateGate>
  )
}
