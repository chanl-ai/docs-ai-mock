"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Info, KeyRound, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CopyableField } from "@/components/shared/copy"
import { FieldRow, Section } from "@/components/shared/surface"
import { FormSkeleton, PageStateGate } from "@/components/shared/states"
import { TagInput } from "@/components/shared/tag-input"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, slugify } from "@/lib/format"
import { sourceTypeMeta } from "@/lib/mock/source-types"
import { cn } from "@/lib/utils"
import type { ChunkStrategy, Rule, Schedule, Sensitivity, Source } from "@/lib/mock/types"
import { SourceDeleteDialog, useRouteSource } from "./source-helpers"

type Draft = Pick<Source, "name" | "scopeSummary" | "parsing" | "chunking" | "rules" | "metadataMapping" | "tags" | "titleFrom" | "collection" | "sensitivity" | "permissions" | "schedule" | "deletedAtSource" | "staleAfterDays" | "notifyOnFailure">

const pick = (s: Source): Draft => ({
  name: s.name,
  scopeSummary: s.scopeSummary,
  parsing: s.parsing,
  chunking: s.chunking,
  rules: s.rules,
  metadataMapping: s.metadataMapping,
  tags: s.tags,
  titleFrom: s.titleFrom,
  collection: s.collection,
  sensitivity: s.sensitivity,
  permissions: s.permissions,
  schedule: s.schedule,
  deletedAtSource: s.deletedAtSource,
  staleAfterDays: s.staleAfterDays,
  notifyOnFailure: s.notifyOnFailure,
})
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const strategyInfo: { value: ChunkStrategy; label: string; description: string; llm?: boolean }[] = [
  { value: "structure", label: "Structure aware", description: "Headings, paragraphs and sentences. Fast and predictable." },
  { value: "topics", label: "Smart topics", description: "A model groups content by topic before chunking.", llm: true },
  { value: "faq", label: "FAQ optimised", description: "Generates sample questions per section so questions match better.", llm: true },
  { value: "headers", label: "Topic headers", description: "Adds a one-line context summary to each chunk.", llm: true },
  { value: "summarise", label: "Summarise", description: "Key points only. Smaller index, less detail.", llm: true },
  { value: "rows", label: "Rows", description: "Tables only: each row is a chunk, headers become field names." },
]
const ruleFields = [
  { value: "path", label: "Path glob" },
  { value: "title", label: "Title contains" },
  { value: "mime", label: "MIME type" },
  { value: "modifiedAfter", label: "Modified after" },
  { value: "sizeUnder", label: "Size under" },
] as const
const parsingOptions = [
  { k: "ocr" as const, label: "OCR", tip: "Runs on scanned PDFs and images. Slower and uses credits." },
  { k: "tables" as const, label: "Table extraction", tip: "Tables in PDF and DOCX become row chunks with headers as field names." },
  { k: "vision" as const, label: "Vision for figures", tip: "Describes images and charts into text." },
  { k: "removeHtml" as const, label: "Remove HTML and boilerplate", tip: "Strips navigation, footers and scripts from web pages." },
]
const scheduleFor = (kind: Schedule["kind"]): Schedule =>
  kind === "manual" ? { kind } : kind === "daily" ? { kind, time: "02:00" } : kind === "weekly" ? { kind, day: "Mon", time: "03:00" } : kind === "monthly" ? { kind, day: 1, time: "03:00" } : { kind: "webhook", safetyNetDaily: true }

export function SourceSettings() {
  const state = usePageState()
  const { source } = useRouteSource()
  if (!source) return null
  return (
    <PageStateGate state={state === "empty" ? "ready" : state} loading={<FormSkeleton fields={8} />}>
      <SettingsForm key={source.id} source={source} />
    </PageStateGate>
  )
}

function SettingsForm({ source }: { source: Source }) {
  const router = useRouter()
  const { base } = useWs()
  const updateSource = useMock((s) => s.updateSource)
  const reprocessSource = useMock((s) => s.reprocessSource)
  const itemCount = useMock((s) => s.items.filter((i) => i.sourceId === source.id).length)
  const [d, setD] = useState<Draft>(() => pick(source))
  const [reprocessOpen, setReprocessOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [secret, setSecret] = useState("whsec_4f9a1c2e7b3d5e6f8a9b0c1d2e3f4a5b")
  const [rotateOpen, setRotateOpen] = useState(false)
  const meta = sourceTypeMeta(source.type)
  const saved = useMemo(() => pick(source), [source])
  const dirty = !same(d, saved)
  const nameError = d.name.trim().length < 2 || d.name.trim().length > 80 ? "Name must be 2 to 80 characters." : undefined

  useEffect(() => {
    if (!dirty) return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", guard)
    return () => window.removeEventListener("beforeunload", guard)
  }, [dirty])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const setRule = (i: number, patch: Partial<Rule>) => set("rules", d.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const save = () => {
    if (nameError) { toast.error(nameError); return }
    const pipelineChanged = !same(d.parsing, saved.parsing) || !same(d.chunking, saved.chunking)
    const scopeChanged = !same(d.rules, saved.rules) || d.scopeSummary !== saved.scopeSummary
    updateSource(source.id, d)
    toast.success("Settings saved", { description: scopeChanged ? "Scope or rules changed, so the next sync runs a full listing." : source.name })
    if (pipelineChanged) setReprocessOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <Accordion type="multiple" defaultValue={["connection", "parsing", "rules", "schedule"]} className="flex flex-col gap-3">
        <AccordionItem value="connection" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Connection and scope</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <FieldRow label="Type" value={<span className="flex flex-wrap items-center gap-2">{meta.label}<span className="text-xs text-muted-foreground">Create a new source to change type.</span></span>} wrap />
              {source.connectionLabel && <FieldRow label="Connection" value={source.connectionLabel} mono />}
              <FieldRow label="Change detection" value={meta.changeDetection} wrap />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="src-name">Name</Label>
                <Input id="src-name" value={d.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!nameError} />
                {nameError ? <p className="text-xs text-destructive">{nameError}</p> : <p className="font-mono text-xs text-muted-foreground">{slugify(d.name)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="src-scope">{meta.scopeLabel}</Label>
                <Textarea id="src-scope" rows={2} value={d.scopeSummary} onChange={(e) => set("scopeSummary", e.target.value)} />
                <p className="text-xs text-muted-foreground">Changing scope makes the next sync a full listing.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="parsing" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Parsing and chunking</AccordionTrigger>
          <AccordionContent className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {parsingOptions.map((o) => (
                <div key={o.k} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor={`p-${o.k}`} className="flex items-center gap-1.5 font-normal">
                    {o.label}
                    <Tooltip><TooltipTrigger asChild><Info className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent className="max-w-xs">{o.tip}</TooltipContent></Tooltip>
                  </Label>
                  <Switch id={`p-${o.k}`} checked={d.parsing[o.k]} onCheckedChange={(v) => set("parsing", { ...d.parsing, [o.k]: v })} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Chunking strategy</Label>
              <RadioGroup value={d.chunking.strategy} onValueChange={(v) => set("chunking", { ...d.chunking, strategy: v as ChunkStrategy })} className="grid gap-2 sm:grid-cols-2">
                {strategyInfo.map((s) => (
                  <label key={s.value} htmlFor={`st-${s.value}`} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.chunking.strategy === s.value && "border-primary bg-primary/5")}>
                    <RadioGroupItem value={s.value} id={`st-${s.value}`} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">{s.label}{s.llm && <Badge variant="outline" className="font-normal">Uses credits on each sync</Badge>}</div>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className={cn("grid gap-6 sm:grid-cols-2", d.chunking.strategy === "rows" && "opacity-50")}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2"><Label htmlFor="c-size">Chunk size (tokens)</Label><Input id="c-size" type="number" className="h-7 w-20 text-right tabular-nums" min={100} max={2000} value={d.chunking.size} disabled={d.chunking.strategy === "rows"} onChange={(e) => set("chunking", { ...d.chunking, size: Math.min(2000, Math.max(100, Number(e.target.value) || 100)) })} /></div>
                <Slider value={[d.chunking.size]} min={100} max={2000} step={16} disabled={d.chunking.strategy === "rows"} onValueChange={([v]) => set("chunking", { ...d.chunking, size: v })} aria-label="Chunk size" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2"><Label htmlFor="c-overlap">Overlap (tokens)</Label><Input id="c-overlap" type="number" className="h-7 w-20 text-right tabular-nums" min={0} max={500} value={d.chunking.overlap} disabled={d.chunking.strategy === "rows"} onChange={(e) => set("chunking", { ...d.chunking, overlap: Math.min(500, Math.max(0, Number(e.target.value) || 0)) })} /></div>
                <Slider value={[d.chunking.overlap]} min={0} max={500} step={10} disabled={d.chunking.strategy === "rows"} onValueChange={([v]) => set("chunking", { ...d.chunking, overlap: v })} aria-label="Overlap" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={d.chunking.language} onValueChange={(v) => set("chunking", { ...d.chunking, language: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="auto">Auto detect</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="fr">French</SelectItem><SelectItem value="es">Spanish</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rules" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Rules and metadata</AccordionTrigger>
          <AccordionContent className="space-y-5">
            <div className="space-y-2">
              <Label>Include and exclude rules</Label>
              <p className="text-xs text-muted-foreground">Include rules are OR&apos;d; exclude rules win. Changing rules makes the next sync a full listing.</p>
              {d.rules.length === 0 && <p className="text-sm text-muted-foreground">No rules. Every item in scope is indexed.</p>}
              {d.rules.map((r, i) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2">
                  <Select value={r.kind} onValueChange={(v) => setRule(i, { kind: v as Rule["kind"] })}>
                    <SelectTrigger className="h-8 w-28" aria-label="Rule kind"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="include">Include</SelectItem><SelectItem value="exclude">Exclude</SelectItem></SelectContent>
                  </Select>
                  <Select value={r.field} onValueChange={(v) => setRule(i, { field: v as Rule["field"] })}>
                    <SelectTrigger className="h-8 w-40" aria-label="Rule field"><SelectValue /></SelectTrigger>
                    <SelectContent>{ruleFields.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="h-8 min-w-[140px] flex-1 font-mono text-xs" value={r.value} aria-label="Rule value" placeholder={r.field === "path" ? "**/Archive/**" : r.field === "sizeUnder" ? "50 MB" : ""} onChange={(e) => setRule(i, { value: e.target.value })} />
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => set("rules", d.rules.filter((_, j) => j !== i))} aria-label="Remove rule"><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("rules", [...d.rules, { id: `r${Date.now()}`, kind: "exclude", field: "path", value: "" }])}><Plus className="size-3.5" /> Add rule</Button>
            </div>
            <div className="space-y-2">
              <Label>Metadata mapping</Label>
              <p className="text-xs text-muted-foreground">Key ← source field. Static values are allowed, for example locale = en.</p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>From</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {d.metadataMapping.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">No mappings. Items carry only the tags below.</TableCell></TableRow>
                    )}
                    {d.metadataMapping.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell><Input className="h-8 min-w-[120px] font-mono text-xs" value={m.key} aria-label="Metadata key" onChange={(e) => set("metadataMapping", d.metadataMapping.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} /></TableCell>
                        <TableCell><Input className="h-8 min-w-[160px] font-mono text-xs" value={m.from} aria-label="Source field" placeholder="field:Dept or static:en" onChange={(e) => set("metadataMapping", d.metadataMapping.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="size-8" onClick={() => set("metadataMapping", d.metadataMapping.filter((_, j) => j !== i))} aria-label="Remove mapping"><Trash2 className="size-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" size="sm" onClick={() => set("metadataMapping", [...d.metadataMapping, { key: "", from: "static:" }])}><Plus className="size-3.5" /> Add mapping</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tags applied to every item</Label>
                <TagInput value={d.tags} onChange={(v) => set("tags", v)} suggestions={["policy", "hr", "engineering", "pricing", "contract", "faq"]} placeholder="policy, hr" />
              </div>
              <div className="space-y-1.5">
                <Label>Title from</Label>
                <Select value={d.titleFrom} onValueChange={(v) => set("titleFrom", v as Draft["titleFrom"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="source">Source title</SelectItem><SelectItem value="heading">First heading</SelectItem><SelectItem value="filename">Filename</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="src-collection">Collection</Label>
                <Input id="src-collection" value={d.collection} onChange={(e) => set("collection", e.target.value)} placeholder="HR, Lending, Engineering…" />
                <p className="text-xs text-muted-foreground">The department boundary a knowledge base can be limited to.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Sensitivity</Label>
                <Select value={d.sensitivity} onValueChange={(v) => set("sensitivity", v as Sensitivity)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="confidential">Confidential</SelectItem><SelectItem value="restricted">Restricted</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schedule" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold">Permissions and schedule</AccordionTrigger>
          <AccordionContent className="space-y-5">
            <div className="space-y-2">
              <Label>Permissions</Label>
              <RadioGroup value={d.permissions.mode} onValueChange={(v) => set("permissions", v === "selected" ? { mode: "selected", principals: [] } : { mode: v as "inherit" | "workspace" })} className="grid gap-2">
                {meta.supportsInherit && (
                  <label htmlFor="pm-inherit" className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.permissions.mode === "inherit" && "border-primary bg-primary/5")}>
                    <RadioGroupItem value="inherit" id="pm-inherit" className="mt-0.5" />
                    <div><div className="text-sm font-medium">Inherit from {meta.short}</div><p className="text-xs text-muted-foreground">Each item keeps its own permissions, mapped to directory users and groups. Groups sync at sign-in.</p></div>
                  </label>
                )}
                <label htmlFor="pm-ws" className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.permissions.mode === "workspace" && "border-primary bg-primary/5")}>
                  <RadioGroupItem value="workspace" id="pm-ws" className="mt-0.5" />
                  <div><div className="text-sm font-medium">Workspace-wide</div><p className="text-xs text-muted-foreground">Every member, API key and MCP token that can query a knowledge base sees these items.</p></div>
                </label>
                <label htmlFor="pm-sel" className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.permissions.mode === "selected" && "border-primary bg-primary/5")}>
                  <RadioGroupItem value="selected" id="pm-sel" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Selected members and groups</div>
                    {d.permissions.mode === "selected" && (
                      <div className="mt-2"><TagInput value={d.permissions.principals} onChange={(v) => set("permissions", { mode: "selected", principals: v })} suggestions={["group:HR", "group:Engineering", "group:Lending", "group:Legal"]} placeholder="group:Legal, user:…" /></div>
                    )}
                  </div>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Refresh schedule</Label>
              <RadioGroup value={d.schedule.kind} onValueChange={(v) => set("schedule", scheduleFor(v as Schedule["kind"]))} className="flex flex-wrap gap-2">
                {(["manual", "daily", "weekly", "monthly", "webhook"] as const).map((k) => (
                  <label key={k} htmlFor={`sc-${k}`} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm", d.schedule.kind === k && "border-primary bg-primary/5", k === "webhook" && !meta.supportsWebhook && "cursor-not-allowed opacity-50")}>
                    <RadioGroupItem value={k} id={`sc-${k}`} disabled={k === "webhook" && !meta.supportsWebhook} />
                    <span>{{ manual: "Manual", daily: "Daily", weekly: "Weekly", monthly: "Monthly", webhook: "Webhook triggered" }[k]}</span>
                  </label>
                ))}
              </RadioGroup>
              {d.schedule.kind === "daily" && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">At</span><Input type="time" className="h-8 w-32" value={d.schedule.time} onChange={(e) => set("schedule", { kind: "daily", time: e.target.value })} aria-label="Time" /></div>}
              {d.schedule.kind === "weekly" && (() => { const w = d.schedule; return (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Select value={w.day} onValueChange={(v) => set("schedule", { ...w, day: v })}><SelectTrigger className="h-8 w-28" aria-label="Day"><SelectValue /></SelectTrigger><SelectContent>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
                  <Input type="time" className="h-8 w-32" value={w.time} onChange={(e) => set("schedule", { ...w, time: e.target.value })} aria-label="Time" />
                </div>
              ) })()}
              {d.schedule.kind === "monthly" && (() => { const m = d.schedule; return (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Day</span>
                  <Input type="number" min={1} max={28} className="h-8 w-20" value={m.day} onChange={(e) => set("schedule", { ...m, day: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })} aria-label="Day of month" />
                  <Input type="time" className="h-8 w-32" value={m.time} onChange={(e) => set("schedule", { ...m, time: e.target.value })} aria-label="Time" />
                </div>
              ) })()}
              {d.schedule.kind === "webhook" && (() => { const wh = d.schedule; return (
                <div className="space-y-3 rounded-md border p-3">
                  <CopyableField label="Webhook URL" value={`https://api.docs-ai.example/v1/hooks/src/${source.id}`} />
                  <CopyableField label="Secret" value={secret} masked />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="safety" className="font-normal">Also run daily as a safety net</Label>
                    <Switch id="safety" checked={wh.safetyNetDaily} onCheckedChange={(v) => set("schedule", { kind: "webhook", safetyNetDaily: v })} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setRotateOpen(true)}><KeyRound className="size-3.5" /> Rotate webhook secret</Button>
                </div>
              ) })()}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Deleted at source</Label>
                <Select value={d.deletedAtSource} onValueChange={(v) => set("deletedAtSource", v as Draft["deletedAtSource"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="remove">Remove from index</SelectItem><SelectItem value="keep_stale">Keep and mark stale</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stale">Stale after (days)</Label>
                <Input id="stale" type="number" min={1} value={d.staleAfterDays} onChange={(e) => set("staleAfterDays", Math.max(1, Number(e.target.value) || 1))} />
                <p className="text-xs text-muted-foreground">Past this, items are flagged stale and go to the curation queue.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <Label htmlFor="notify" className="font-normal">Notify on failure (recipients in Settings → Notifications)</Label>
              <Switch id="notify" checked={d.notifyOnFailure} onCheckedChange={(v) => set("notifyOnFailure", v)} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Section title="Danger zone" className="border-destructive/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Delete this source</p>
            <p className="text-xs text-muted-foreground">Removes {num(itemCount)} items, the sync history and their chunks from every knowledge base that reads it.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="size-3.5" /> Delete source</Button>
        </div>
      </Section>

      {dirty && (
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 px-4 py-3 shadow-sm backdrop-blur" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <span className="text-sm text-muted-foreground">You have unsaved changes.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDiscardOpen(true)}>Discard</Button>
            <Button size="sm" onClick={save} disabled={!!nameError}>Save changes</Button>
          </div>
        </div>
      )}

      <Dialog open={reprocessOpen} onOpenChange={setReprocessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprocess all {num(itemCount)} items now?</DialogTitle>
            <DialogDescription>Parsing or chunking changed. Existing chunks were built with the old settings. Reprocessing rebuilds every item; otherwise items update only when the next sync touches them.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { updateSource(source.id, { reprocessPending: true }); setReprocessOpen(false); toast.message("Reprocess pending", { description: "Items update as syncs touch them." }) }}>Not now</Button>
            <Button onClick={() => { reprocessSource(source.id); setReprocessOpen(false); toast.success("Reprocessing all items", { description: source.name }) }}>Reprocess now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={discardOpen} onOpenChange={setDiscardOpen} title="Discard unsaved changes?" description="The form goes back to the saved settings." confirmLabel="Discard" destructive onConfirm={() => setD(saved)} />
      <ConfirmDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        title="Rotate the webhook secret?"
        description="The old secret stops working immediately. Update the sender with the new secret, or change notifications are rejected until you do."
        confirmLabel="Rotate"
        onConfirm={() => { setSecret(`whsec_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 38)); toast.success("Webhook secret rotated") }}
      />
      <SourceDeleteDialog source={source} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => router.push(`${base}/sources`)} />
    </div>
  )
}
