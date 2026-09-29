"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Plug, Plus, MoreHorizontal, ExternalLink, Unlink, SlidersHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { RunStatusBadge, SensitivityBadge } from "@/components/shared/status-badge"
import { AdminOnly } from "@/components/shared/role-gate"
import { SourceTypeIcon, sourceTypeMeta } from "@/lib/mock/source-types"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, relative } from "@/lib/format"
import type { KbSourceLink, Rule, Source } from "@/lib/mock/types"

type RowT = KbSourceLink & { source: Source }

export default function KbSourcesPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { base } = useWs()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const sources = useMock((s) => s.sources)
  const attachSource = useMock((s) => s.attachSource)
  const detachSource = useMock((s) => s.detachSource)
  const setKbSourceRules = useMock((s) => s.setKbSourceRules)
  const [attachOpen, setAttachOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [editing, setEditing] = useState<RowT | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [detaching, setDetaching] = useState<RowT | null>(null)

  const rows = useMemo<RowT[]>(() => (state === "empty" ? [] : kb.sources.map((l) => ({ ...l, source: sources.find((s) => s.id === l.sourceId)! })).filter((r) => r.source)), [kb.sources, sources, state])
  const unattached = sources.filter((s) => !kb.sources.some((l) => l.sourceId === s.id))
  const lastWithPublic = rows.length === 1 && kb.access.publicLink.enabled

  const columns = useMemo<ColumnDef<RowT>[]>(
    () => [
      {
        id: "name",
        accessorFn: (r) => r.source.name,
        header: "Source",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <SourceTypeIcon type={row.original.source.type} />
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.source.name}</div>
              <div className="truncate text-xs text-muted-foreground">{sourceTypeMeta(row.original.source.type).label} · {row.original.source.collection}</div>
            </div>
          </div>
        ),
      },
      { id: "items", accessorFn: (r) => r.itemsContributed, header: "Items contributed", meta: { align: "right" }, cell: ({ row }) => num(row.original.itemsContributed) },
      {
        id: "filter",
        header: "Filter",
        cell: ({ row }) => (row.original.rules.length ? (
          <Tooltip><TooltipTrigger asChild><Badge variant="outline" className="cursor-default font-normal">Rule · {row.original.rules.length}</Badge></TooltipTrigger><TooltipContent><ul className="text-xs">{row.original.rules.map((r) => <li key={r.id} className="font-mono">{r.kind} {r.field} {r.value}</li>)}</ul></TooltipContent></Tooltip>
        ) : <Badge variant="secondary" className="font-normal">All</Badge>),
      },
      { id: "sensitivity", header: "Sensitivity", cell: ({ row }) => <SensitivityBadge level={row.original.source.sensitivity} /> },
      { id: "sync", accessorFn: (r) => r.source.lastSyncAt ?? "", header: "Last sync", cell: ({ row }) => <span className="text-muted-foreground">{relative(row.original.source.lastSyncAt)}</span> },
      { id: "status", header: "Status", cell: ({ row }) => <RunStatusBadge status={row.original.source.status === "revoked" ? "failed" : row.original.source.lastRunStatus} /> },
      {
        id: "actions",
        header: "",
        size: 40,
        cell: ({ row }) => (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditing(row.original); setRules(row.original.rules) }}><SlidersHorizontal className="size-4" /> Edit contribution</DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={`${base}/sources/${row.original.sourceId}`}><ExternalLink className="size-4" /> Open source</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDetaching(row.original)}><Unlink className="size-4" /> Detach</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [base]
  )

  return (
    <AdminOnly>
      <PageStateGate state={state}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Control which sources feed this knowledge base, and narrow what each contributes. Changing a source's parsing or chunking reprocesses its items once; every knowledge base picks the new chunks up on its next refresh.</p>
            <Button size="sm" onClick={() => { setPicked([]); setAttachOpen(true) }}><Plus className="size-4" /> Attach source</Button>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(r) => r.sourceId}
            hideViewOptions
            hidePagination
            onRowClick={(r) => { setEditing(r); setRules(r.rules) }}
            emptyState={
              <div className="rounded-lg border">
                <EmptyState icon={Plug} title="This knowledge base reads no sources" description="A source is how content gets in: upload files, crawl a site, or connect an app. Attach one and the next refresh indexes its items." action={{ label: "Attach source", onClick: () => setAttachOpen(true) }} secondaryAction={{ label: "Add a new source", href: `${base}/sources/new` }} />
              </div>
            }
          />
          {rows.some((r) => r.source.usedByKbIds.length <= 1) && rows.length > 0 && (
            <p className="text-xs text-muted-foreground">A detached source that no other knowledge base uses can be deleted from Sources.</p>
          )}
        </div>
      </PageStateGate>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach sources</DialogTitle>
            <DialogDescription>Sources not yet read by {kb.name}. Items appear after the next refresh.</DialogDescription>
          </DialogHeader>
          {unattached.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every source is already attached. <Link href={`${base}/sources/new`} className="underline underline-offset-4">Add a new source</Link>.</p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
              {unattached.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Checkbox id={`att-${s.id}`} checked={picked.includes(s.id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
                  <SourceTypeIcon type={s.type} />
                  <label htmlFor={`att-${s.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <div className="truncate">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{num(s.itemsIndexed)} items · {s.collection} · {s.sensitivity}</div>
                  </label>
                  {kb.collections.length > 0 && !kb.collections.includes(s.collection) && <Badge variant="outline" className="font-normal text-amber-700 dark:text-amber-300">Outside collections</Badge>}
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)}>Cancel</Button>
            <Button disabled={!picked.length} onClick={() => { picked.forEach((id) => attachSource(kb.id, id)); toast.success(`Attached ${picked.length} source${picked.length === 1 ? "" : "s"}`); setAttachOpen(false) }}>Attach {picked.length || ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Contribution rules · {editing?.source.name}</SheetTitle>
            <SheetDescription>Narrow what this source contributes to {kb.name} only. The source's own rules still apply first.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {rules.map((r, i) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2">
                <Select value={r.kind} onValueChange={(v) => setRules(rules.map((x, j) => (j === i ? { ...x, kind: v as Rule["kind"] } : x)))}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="include">Include</SelectItem><SelectItem value="exclude">Exclude</SelectItem></SelectContent>
                </Select>
                <Select value={r.field} onValueChange={(v) => setRules(rules.map((x, j) => (j === i ? { ...x, field: v as Rule["field"] } : x)))}>
                  <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="path">Path glob</SelectItem><SelectItem value="title">Title contains</SelectItem><SelectItem value="mime">MIME type</SelectItem><SelectItem value="modifiedAfter">Modified after</SelectItem></SelectContent>
                </Select>
                <Input className="h-8 min-w-[140px] flex-1 font-mono text-xs" value={r.value} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="docs/changelog/**" />
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-3.5" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRules([...rules, { id: `kr${Date.now()}`, kind: "exclude", field: "path", value: "" }])}><Plus className="size-3.5" /> Add rule</Button>
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-muted-foreground">Metadata equals</Label>
              <div className="flex gap-2"><Input className="h-8 font-mono text-xs" placeholder="key" /><Input className="h-8 font-mono text-xs" placeholder="value" /></div>
              <Label className="text-xs text-muted-foreground">Tag in</Label>
              <Input className="h-8 font-mono text-xs" placeholder="policy, hr" />
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => { if (editing) setKbSourceRules(kb.id, editing.sourceId, rules.filter((r) => r.value)); toast.success("Contribution rules saved", { description: "Applied on the next refresh." }); setEditing(null) }}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {detaching && lastWithPublic ? (
        <Dialog open onOpenChange={(o) => !o && setDetaching(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cannot detach the last source</DialogTitle></DialogHeader>
            <Alert>
              <AlertTitle>The public share link is on</AlertTitle>
              <AlertDescription>A knowledge base with a public link must keep at least one source. Turn the link off on the Access tab first, or attach another source.</AlertDescription>
            </Alert>
            <DialogFooter><Button asChild variant="outline"><Link href={`${base}/kb/${kb.id}/access`}>Open Access</Link></Button><Button onClick={() => setDetaching(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={!!detaching}
          onOpenChange={(o) => !o && setDetaching(null)}
          title={`Detach ${detaching?.source.name}?`}
          description={<p>Chunks from this source are removed from the index on the next refresh. The source itself and its items are kept{detaching && detaching.source.usedByKbIds.length <= 1 ? "; no other knowledge base uses it, so you may want to delete it from Sources" : ""}.</p>}
          confirmLabel="Detach"
          destructive
          onConfirm={() => { if (detaching) detachSource(kb.id, detaching.sourceId); toast.success("Source detached"); setDetaching(null) }}
        />
      )}
    </AdminOnly>
  )
}
