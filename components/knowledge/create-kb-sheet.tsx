"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Plus } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { SelectableCard, SelectableCardGroup } from "@/components/ui/selectable-card"
import { Stepper } from "@/components/shared/stepper"
import { KB_COLORS, KbDot } from "@/components/knowledge/kb-dot"
import { DataTable } from "@/components/shared/data-table"
import { SourceTypeIcon, sourceTypeMeta } from "@/lib/mock/source-types"
import { RunStatusBadge } from "@/components/shared/status-badge"
import { AddSourceWizard } from "@/components/sources/add-source-wizard"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, relative } from "@/lib/format"
import type { Source } from "@/lib/mock/types"
import { TagInput } from "@/components/shared/tag-input"

const STEPS = ["Basics", "Sources", "Retrieval preset"] as const

export function CreateKbSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const { base } = useWs()
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const createKb = useMock((s) => s.createKb)
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("teal")
  const [selected, setSelected] = useState<string[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [preset, setPreset] = useState<"balanced" | "precise" | "raw">("balanced")
  const [nested, setNested] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameTaken = kbs.some((k) => k.name.trim().toLowerCase() === name.trim().toLowerCase())
  const neverSynced = sources.filter((s) => selected.includes(s.id) && !s.lastSyncAt)
  const allCollections = useMemo(() => Array.from(new Set(sources.map((s) => s.collection))), [sources])

  const columns = useMemo<ColumnDef<Source>[]>(
    () => [
      {
        id: "pick",
        header: "",
        size: 32,
        cell: ({ row }) => <Checkbox checked={selected.includes(row.original.id)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, row.original.id] : s.filter((x) => x !== row.original.id)))} aria-label={`Select ${row.original.name}`} />,
      },
      {
        accessorKey: "name",
        header: "Source",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <SourceTypeIcon type={row.original.type} />
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.name}</div>
              <div className="truncate text-xs text-muted-foreground">{sourceTypeMeta(row.original.type).label} · {row.original.collection}</div>
            </div>
          </div>
        ),
      },
      { id: "items", accessorFn: (r) => r.itemsIndexed, header: "Items", meta: { align: "right" }, cell: ({ row }) => num(row.original.itemsIndexed) },
      { id: "sync", header: "Last sync", cell: ({ row }) => <div className="flex items-center gap-2 text-muted-foreground"><RunStatusBadge status={row.original.lastRunStatus} /> <span className="hidden text-xs sm:inline">{relative(row.original.lastSyncAt)}</span></div> },
    ],
    [selected]
  )

  const reset = () => {
    setStep(1); setName(""); setDescription(""); setSelected([]); setPreset("balanced"); setError(null); setCollections([])
  }

  const next = () => {
    if (step === 1) {
      if (name.trim().length < 2 || name.length > 80) return setError("Name is 2 to 80 characters")
      if (nameTaken) return setError("A knowledge base with this name already exists")
      if (description.length > 500) return setError("Description is at most 500 characters")
      setError(null)
      setStep(2)
    } else if (step === 2) {
      if (!selected.length) return setError("Pick at least one source")
      setError(null)
      setStep(3)
    }
  }

  const create = () => {
    const kb = createKb({ name: name.trim(), description: description.trim(), color, sourceIds: selected, preset, collections })
    toast.success("Knowledge base created", { description: `${kb.name} · first index build started` })
    reset()
    onOpenChange(false)
    router.push(`${base}/kb/${kb.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle>New knowledge base</SheetTitle>
          <SheetDescription>Name it, choose the sources it reads, and start with sensible retrieval defaults.</SheetDescription>
          <Stepper steps={STEPS} current={step} onStepClick={(s) => s < step && setStep(s)} className="pt-2" />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="kb-name">Name</Label>
                <Input id="kb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Policies" autoFocus aria-invalid={!!error && step === 1} />
                {nameTaken && <p className="text-xs text-destructive">A knowledge base with this name already exists.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-desc">Description</Label>
                <Textarea id="kb-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this index answers, and for whom. This is also the description an AI client sees for the search tool." rows={3} />
                <p className="text-xs text-muted-foreground">{description.length} / 500</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(KB_COLORS).map((c) => (
                        <SelectItem key={c} value={c}><span className="flex items-center gap-2"><KbDot color={c} /> <span className="capitalize">{c}</span></span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Collections it may read</Label>
                  <TagInput value={collections} onChange={setCollections} suggestions={allCollections} placeholder="All collections" />
                  <p className="text-xs text-muted-foreground">Department boundaries. Empty means any collection its sources belong to.</p>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{selected.length ? `${selected.length} selected` : "Pick the sources this knowledge base reads."}</p>
                <Button variant="outline" size="sm" onClick={() => setNested(true)}>
                  <Plus className="size-3.5" /> Add a new source
                </Button>
              </div>
              {sources.length === 0 ? (
                <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                  No sources yet. A source is how content gets in.
                  <div className="mt-3"><Button size="sm" onClick={() => setNested(true)}>Add a source</Button></div>
                </div>
              ) : (
                <DataTable columns={columns} data={sources} getRowId={(r) => r.id} hideViewOptions hidePagination dense onRowClick={(r) => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
              )}
              {neverSynced.length > 0 && (
                <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {neverSynced.map((s) => s.name).join(", ")} {neverSynced.length === 1 ? "has" : "have"} never synced. The knowledge base will be empty until the first sync finishes.
                </p>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <SelectableCardGroup columns={1}>
                <SelectableCard selected={preset === "balanced"} onSelect={() => setPreset("balanced")} title="Balanced" description="Hybrid search, rerank on, 8 chunks, threshold 0.50, answer synthesis on. Good default for policy and support content." />
                <SelectableCard selected={preset === "precise"} onSelect={() => setPreset("precise")} title="Precise" description="Hybrid, rerank on, 5 chunks, threshold 0.65, temperature 0. Fewer answers, fewer wrong ones. For fees, limits and regulated wording." />
                <SelectableCard selected={preset === "raw"} onSelect={() => setPreset("raw")} title="Raw retrieval" description="Hybrid, rerank off, 10 chunks, threshold 0.40, no synthesis. Returns chunks only, for your own model to answer from." />
              </SelectableCardGroup>
              <p className="text-xs text-muted-foreground">You can change all of this on the Retrieval tab.</p>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter className="flex-row items-center justify-between border-t sm:justify-between">
          <div className="flex gap-1">{STEPS.map((_, i) => <span key={i} className={`size-1.5 rounded-full ${i + 1 === step ? "bg-primary" : "bg-muted-foreground/30"}`} />)}</div>
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
            {step < 3 ? <Button onClick={next} disabled={step === 2 && !selected.length}>Next</Button> : <Button onClick={create}>Create</Button>}
          </div>
        </SheetFooter>
      </SheetContent>
      <Sheet open={nested} onOpenChange={setNested}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Add source</SheetTitle>
            <SheetDescription>Configure a new source</SheetDescription>
          </SheetHeader>
          <AddSourceWizard mode="sheet" onDone={(src) => { if (src) setSelected((s) => [...s, src.id]); setNested(false) }} />
        </SheetContent>
      </Sheet>
    </Sheet>
  )
}
