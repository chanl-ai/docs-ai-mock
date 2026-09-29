"use client"

import { Info, Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { TagInput } from "@/components/shared/tag-input"
import { Section } from "@/components/shared/surface"
import { models } from "@/lib/mock/seed/settings"
import type { MetadataFilter, RetrievalSettings, Source } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

interface Props {
  value: RetrievalSettings
  onChange: (patch: Partial<RetrievalSettings>) => void
  sources: Source[]
  metadataKeys: string[]
  variant: "full" | "rail"
  disabled?: boolean
}

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><Info className="size-3.5 text-muted-foreground" /></TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  )
}

function SliderField({ label, tip, value, min, max, step, onChange, disabled, format }: { label: string; tip?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; disabled?: boolean; format?: (v: number) => string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">{label}{tip && <Tip text={tip} />}</Label>
        <Input type="number" className="h-7 w-20 text-right tabular-nums" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} />
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} disabled={disabled} />
      {format && <p className="text-xs text-muted-foreground">{format(value)}</p>}
    </div>
  )
}

function FiltersEditor({ value, onChange, keys, disabled }: { value: MetadataFilter[]; onChange: (v: MetadataFilter[]) => void; keys: string[]; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      {value.map((f, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input list="rf-keys" className="h-8 w-32 font-mono text-xs" value={f.key} placeholder="key" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} disabled={disabled} />
          <Select value={f.op} onValueChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, op: v as MetadataFilter["op"] } : x)))} disabled={disabled}>
            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="equals">equals</SelectItem><SelectItem value="in">in</SelectItem><SelectItem value="not">not</SelectItem></SelectContent>
          </Select>
          <Input className="h-8 min-w-[100px] flex-1 font-mono text-xs" value={f.value} placeholder={f.op === "in" ? "2025, 2026" : "value"} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} disabled={disabled} />
          {!disabled && <Button variant="ghost" size="icon" className="size-8" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
        </div>
      ))}
      <datalist id="rf-keys">{keys.map((k) => <option key={k} value={k} />)}</datalist>
      {!disabled && <Button variant="outline" size="sm" className="h-7" onClick={() => onChange([...value, { key: "", op: "equals", value: "" }])}><Plus className="size-3.5" /> Add filter</Button>}
    </div>
  )
}

/** One component, two variants: the full Retrieval tab form and the playground's compact rail. */
export function RetrievalForm({ value: v, onChange, sources, metadataKeys, variant, disabled }: Props) {
  const rail = variant === "rail"
  const search = (
    <div className={cn("space-y-5", rail && "space-y-4")}>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm">Search mode <Tip text="Hybrid fuses semantic and keyword results with reciprocal rank fusion, k=60." /></Label>
        <RadioGroup value={v.searchMode} onValueChange={(x) => onChange({ searchMode: x as RetrievalSettings["searchMode"] })} className="flex flex-wrap gap-2" disabled={disabled}>
          {(["semantic", "keyword", "hybrid"] as const).map((m) => (
            <label key={m} htmlFor={`sm-${variant}-${m}`} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm capitalize", v.searchMode === m && "border-primary bg-primary/5")}>
              <RadioGroupItem value={m} id={`sm-${variant}-${m}`} /> {m}
            </label>
          ))}
        </RadioGroup>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="flex items-center gap-1.5 text-sm">Rerank <Tip text="Reranks the top 50 hits with a cross-encoder before applying the chunk limit." /></Label>
        <div className="flex items-center gap-2">
          {v.rerank && !rail && (
            <Select value={v.reranker} onValueChange={(x) => onChange({ reranker: x as RetrievalSettings["reranker"] })} disabled={disabled}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="hosted">Hosted default</SelectItem><SelectItem value="cross-encoder">Cross-encoder</SelectItem></SelectContent>
            </Select>
          )}
          <Switch checked={v.rerank} onCheckedChange={(x) => onChange({ rerank: x })} disabled={disabled} />
        </div>
      </div>
      <SliderField label="Chunk limit" tip="Chunks returned per query." value={v.chunkLimit} min={1} max={20} step={1} onChange={(x) => onChange({ chunkLimit: x })} disabled={disabled} format={v.chunkLimit > 12 && !v.rerank ? () => "Above 12 without rerank tends to dilute answers." : undefined} />
      <SliderField label="Relevance threshold" tip="Hits below are dropped; if none remain the response is a no-answer." value={v.threshold} min={0} max={1} step={0.05} onChange={(x) => onChange({ threshold: Math.round(x * 100) / 100 })} disabled={disabled} />
      {!rail && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm">Query rewriting <Tip text="The model reformulates the user's message before searching." /></Label>
              <Switch checked={v.queryRewrite} onCheckedChange={(x) => onChange({ queryRewrite: x })} disabled={disabled} />
            </div>
            {v.queryRewrite && <Textarea value={v.rewriteInstructions} onChange={(e) => onChange({ rewriteInstructions: e.target.value })} placeholder="Expand abbreviations; add the product name when it is implied." rows={2} maxLength={1000} disabled={disabled} />}
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Search scope</Label>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => {
                const on = v.scopeSourceIds.length === 0 || v.scopeSourceIds.includes(s.id)
                return (
                  <button key={s.id} type="button" disabled={disabled} onClick={() => { const all = sources.map((x) => x.id); const cur = v.scopeSourceIds.length ? v.scopeSourceIds : all; const next = on ? cur.filter((x) => x !== s.id) : [...cur, s.id]; onChange({ scopeSourceIds: next.length === all.length ? [] : next }) }} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/5" : "text-muted-foreground")}>
                    {s.name}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">{v.scopeSourceIds.length === 0 ? "All attached sources" : `${v.scopeSourceIds.length} of ${sources.length} sources`}</p>
          </div>
        </>
      )}
    </div>
  )

  const synthesis = (
    <div className={cn("space-y-5", rail && "space-y-4")}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">Synthesise answer <Tip text="Off returns chunks only." /></Label>
        <Switch checked={v.synthesis} onCheckedChange={(x) => onChange({ synthesis: x })} disabled={disabled} />
      </div>
      {v.synthesis && (
        <>
          <div className="space-y-2">
            <Label className="text-sm">Model</Label>
            <Select value={v.model} onValueChange={(x) => onChange({ model: x })} disabled={disabled}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OpenAI", "Anthropic"].map((p) => (
                  <SelectGroup key={p}>
                    <SelectLabel>{p}</SelectLabel>
                    {models.filter((m) => m.provider === p).map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SliderField label="Temperature" value={v.temperature} min={0} max={1} step={0.1} onChange={(x) => onChange({ temperature: Math.round(x * 10) / 10 })} disabled={disabled} />
          {!rail && (
            <div className="space-y-2">
              <Label className="text-sm">Max answer tokens</Label>
              <Input type="number" min={64} max={4096} value={v.maxTokens} onChange={(e) => onChange({ maxTokens: Number(e.target.value) })} className="w-32" disabled={disabled} />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm">System instructions</Label>
            <Textarea value={v.instructions} onChange={(e) => onChange({ instructions: e.target.value })} rows={rail ? 3 : 4} maxLength={4000} disabled={disabled} />
            <p className="text-xs text-muted-foreground">{v.instructions.length} / 4000</p>
          </div>
          {!rail && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Citation style</Label>
                <RadioGroup value={v.citationStyle} onValueChange={(x) => onChange({ citationStyle: x as RetrievalSettings["citationStyle"] })} className="flex flex-wrap gap-2" disabled={disabled}>
                  {[["inline", "Inline markers [1]"], ["footnotes", "Footnotes"], ["links", "Source links only"], ["none", "None"]].map(([k, l]) => (
                    <label key={k} htmlFor={`cs-${k}`} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm", v.citationStyle === k && "border-primary bg-primary/5")}>
                      <RadioGroupItem value={k} id={`cs-${k}`} /> {l}
                    </label>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">Citations carry section, page and version, and the answer names the document it followed when precedence applied.</p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">Return tables as structured values <Tip text="Fee schedules, limits and eligibility bands come back as values, not paragraphs." /></Label>
                <Switch checked={v.structuredTables} onCheckedChange={(x) => onChange({ structuredTables: x })} disabled={disabled} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">Include source chunks in response <Tip text="Affects API and MCP payload size." /></Label>
                <Switch checked={v.includeChunks} onCheckedChange={(x) => onChange({ includeChunks: x })} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">No-answer message</Label>
                <Input value={v.noAnswerMessage} onChange={(e) => onChange({ noAnswerMessage: e.target.value })} disabled={disabled} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )

  const defaults = (
    <div className={cn("space-y-4")}>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm">Default metadata filters <Tip text="Applied to every query unless the caller overrides with explicit filters and has the filters:override scope." /></Label>
        <FiltersEditor value={v.defaultFilters} onChange={(x) => onChange({ defaultFilters: x })} keys={metadataKeys} disabled={disabled} />
      </div>
      <div className={cn("grid gap-3", !rail && "sm:grid-cols-2")}>
        <div className="space-y-1.5"><Label className="text-sm">Tags include</Label><TagInput value={v.tagsInclude} onChange={(x) => onChange({ tagsInclude: x })} placeholder="policy" disabled={disabled} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Tags exclude</Label><TagInput value={v.tagsExclude} onChange={(x) => onChange({ tagsExclude: x })} placeholder="draft" disabled={disabled} /></div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">Include untagged</Label>
        <Switch checked={v.includeUntagged} onCheckedChange={(x) => onChange({ includeUntagged: x })} disabled={disabled} />
      </div>
    </div>
  )

  if (rail) {
    return (
      <div className="space-y-5">
        {search}
        <div className="border-t pt-4">{synthesis}</div>
        <Accordion type="multiple" className="border-t">
          <AccordionItem value="filters">
            <AccordionTrigger className="text-sm">Filters and tags {(v.defaultFilters.length > 0 || v.tagsInclude.length > 0 || v.tagsExclude.length > 0) && <Badge variant="secondary" className="ml-2 font-normal">{v.defaultFilters.length + v.tagsInclude.length + v.tagsExclude.length}</Badge>}</AccordionTrigger>
            <AccordionContent>{defaults}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Section title="Search" description="How a query becomes chunks.">{search}</Section>
      <Section title="Answer synthesis" description="Whether and how the chunks become an answer.">{synthesis}</Section>
      <Section title="Defaults" description="Applied to every query from chat, the API and MCP.">{defaults}</Section>
    </div>
  )
}
