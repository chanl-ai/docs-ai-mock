"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { Section } from "@/components/shared/surface"
import { StatRow, StatTile } from "@/components/shared/stat-tile"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { EmptyState, PageStateGate, StatSkeleton, TableSkeleton } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { CopyButton } from "@/components/shared/copy"
import { MimeIcon } from "@/components/shared/status-badge"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { bytes, mimeLabel, num, pct, relative } from "@/lib/format"
import type { FileRecord } from "@/lib/mock/types"
import { cn } from "@/lib/utils"
import { FileDeleteDialog } from "./file-dialogs"
import { folderLabel, mimeGroup, type MimeGroup } from "./file-utils"

const GB = 1024 ** 3
const INDEX_BYTES = 1.1 * GB
const SUPPORT = "support@docs-ai.example"
const SEGMENT_CLASS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-primary/60", "bg-muted-foreground/50", "bg-muted-foreground/25"]

export function StorageOverview() {
  const state = usePageState()
  const { base } = useWs()
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Storage"
        description="What uses the workspace quota and how to get space back."
        actions={<Button asChild size="sm" variant="outline"><Link href={`${base}/files`}><ArrowLeft className="size-4" /> Files</Link></Button>}
      />
      <AdminOnly>
        <PageStateGate
          state={state}
          loading={<div className="space-y-5"><StatSkeleton /><TableSkeleton rows={6} /></div>}
          empty={<StorageBody empty />}
        >
          <StorageBody />
        </PageStateGate>
      </AdminOnly>
    </div>
  )
}

function StorageBody({ empty }: { empty?: boolean }) {
  const { base, workspace } = useWs()
  const allFiles = useMock((s) => s.files)
  const folders = useMock((s) => s.folders)
  const pruneVersions = useMock((s) => s.pruneVersions)
  const files = empty ? [] : allFiles
  const [deleting, setDeleting] = useState<FileRecord[]>([])
  const [days, setDays] = useState("90")
  const [pruneOpen, setPruneOpen] = useState(false)

  const used = empty ? 0 : workspace.storageUsedBytes
  const quota = workspace.storageQuotaBytes
  const ratio = used / quota

  // The seed library is a sample of the workspace; its type mix is scaled to the used bytes.
  const breakdown = useMemo(() => {
    if (!files.length || !used) return [] as { label: string; bytes: number }[]
    const index = Math.min(INDEX_BYTES, used * 0.3)
    const fileBytes = (used - index) / 1.06
    const previews = fileBytes * 0.06
    const byGroup = new Map<MimeGroup, number>()
    files.forEach((f) => byGroup.set(mimeGroup(f.mimeType), (byGroup.get(mimeGroup(f.mimeType)) ?? 0) + f.sizeBytes))
    const sampleTotal = Array.from(byGroup.values()).reduce((a, b) => a + b, 0)
    const groups = Array.from(byGroup.entries()).sort((a, b) => b[1] - a[1]).map(([label, b]) => ({ label, bytes: (b / sampleTotal) * fileBytes }))
    return [...groups, { label: "Previews", bytes: previews }, { label: "Index data", bytes: index }]
  }, [files, used])

  const oldVersions = files.flatMap((f) => f.versions.filter((v) => v.n !== f.version).map((v) => ({ ...v, file: f })))
  const oldBytes = oldVersions.reduce((n, v) => n + v.sizeBytes, 0)
  const cutoff = Date.now() - Number(days) * 86400_000
  const prunable = oldVersions.filter((v) => new Date(v.at).getTime() <= cutoff)
  const prunableBytes = prunable.reduce((n, v) => n + v.sizeBytes, 0)
  const largest = [...files].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 20)
  const unused = files.filter((f) => f.usedBySourceIds.length === 0)

  const nameCol: ColumnDef<FileRecord> = {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex min-w-[200px] max-w-[380px] items-center gap-2">
        <MimeIcon mime={row.original.mimeType} />
        <div className="min-w-0">
          <Link href={`${base}/files/${row.original.id}`} className="block truncate font-medium hover:underline">{row.original.name}</Link>
          <div className="truncate text-[11px] text-muted-foreground">{folderLabel(row.original.folderId, folders)}</div>
        </div>
      </div>
    ),
  }
  const sizeCol: ColumnDef<FileRecord> = { accessorKey: "sizeBytes", header: ({ column }) => <SortHeader column={column} title="Size" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="whitespace-nowrap">{bytes(row.original.sizeBytes)}</span> }
  const typeCol: ColumnDef<FileRecord> = { id: "type", header: "Type", cell: ({ row }) => <span className="text-muted-foreground">{mimeLabel(row.original.mimeType)}</span> }
  const modCol: ColumnDef<FileRecord> = { accessorKey: "modifiedAt", header: ({ column }) => <SortHeader column={column} title="Modified" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.modifiedAt)}</span> }
  const delCol: ColumnDef<FileRecord> = {
    id: "actions",
    header: "",
    size: 40,
    cell: ({ row }) => (
      <div className="text-right">
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Delete ${row.original.name}`} onClick={() => setDeleting([row.original])}><Trash2 className="size-4" /></Button>
      </div>
    ),
  }

  return (
    <div className="flex flex-col gap-6">
      {ratio > 0.9 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Storage is {pct(ratio)} full</AlertTitle>
          <AlertDescription>Uploads stop at 100%. Delete unused files, prune old versions or request more storage below.</AlertDescription>
        </Alert>
      )}

      <Section title="Usage" description={`${workspace.plan} plan · ${bytes(quota)} included`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{bytes(used)} <span className="text-sm font-normal text-muted-foreground">of {bytes(quota)}</span></p>
            <span className="text-sm tabular-nums text-muted-foreground">{pct(ratio)} used · {bytes(Math.max(0, quota - used))} free</span>
          </div>
          <Progress value={Math.min(100, ratio * 100)} className="h-2" aria-label="Storage used" />
          {breakdown.length > 0 && (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Storage breakdown">
                {breakdown.map((b, i) => (
                  <Tooltip key={b.label}>
                    <TooltipTrigger asChild>
                      <div className={cn("h-full border-r border-background last:border-r-0", SEGMENT_CLASS[i % SEGMENT_CLASS.length])} style={{ width: `${(b.bytes / quota) * 100}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{b.label}: {bytes(b.bytes)}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {breakdown.map((b, i) => (
                  <li key={b.label} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", SEGMENT_CLASS[i % SEGMENT_CLASS.length])} />
                    <span>{b.label}</span>
                    <span className="tabular-nums text-muted-foreground">{bytes(b.bytes)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Section>

      <StatRow>
        <StatTile label="Files" value={num(files.length)} hint={`${num(unused.length)} not used by a source`} />
        <StatTile label="Unused files" value={bytes(unused.reduce((n, f) => n + f.sizeBytes, 0))} hint="Safe to delete without affecting answers" tone={unused.length ? "warn" : "default"} />
        <StatTile label="Old versions" value={bytes(oldBytes)} hint={`${num(oldVersions.length)} non-current versions`} />
        <StatTile label="Index data" value={bytes(breakdown.find((b) => b.label === "Index data")?.bytes ?? 0)} hint="Chunks and embeddings for every KB" />
      </StatRow>

      {files.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState icon={Trash2} title="No files stored" description="Storage fills with uploaded files, their previews and index data. Upload files to the library to see what uses the quota." action={{ label: "Upload files", href: `${base}/files?upload=1` }} />
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold">Largest files</h2>
              <p className="text-xs text-muted-foreground">Top 20 by size, current version.</p>
            </div>
            <DataTable columns={[nameCol, sizeCol, typeCol, modCol, delCol]} data={largest} getRowId={(r) => r.id} hideViewOptions hidePagination initialSorting={[{ id: "sizeBytes", desc: true }]} pageSize={20} />
          </section>

          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold">Unused files</h2>
              <p className="text-xs text-muted-foreground">No source includes these, so deleting them does not change any answer.</p>
            </div>
            <DataTable
              columns={[selectColumn<FileRecord>(), nameCol, sizeCol, typeCol, modCol, delCol]}
              data={unused}
              getRowId={(r) => r.id}
              hideViewOptions
              bulkActions={[{ label: "Delete", icon: Trash2, variant: "destructive", onClick: (rows) => setDeleting(rows) }]}
              emptyState={<div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">Every file is used by at least one source.</div>}
            />
          </section>

          <Section title="Old versions" description={`${num(oldVersions.length)} non-current versions use ${bytes(oldBytes)}. The current version of each file is always kept.`}>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prune-days">Prune versions older than</Label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger id="prune-days" className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["30", "90", "180", "365"].map((d) => <SelectItem key={d} value={d}>{d} days</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" disabled={!prunable.length} onClick={() => setPruneOpen(true)}>Prune {num(prunable.length)} version{prunable.length === 1 ? "" : "s"}</Button>
              <span className="pb-2 text-xs tabular-nums text-muted-foreground">Reclaims {bytes(prunableBytes)}</span>
            </div>
          </Section>
        </>
      )}

      <Section title="Request more storage">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>This workspace is on the {workspace.plan} plan with {bytes(quota)}. To raise the quota, email</span>
          <span className="font-mono text-xs">{SUPPORT}</span>
          <CopyButton text={SUPPORT} iconOnly label="Copy address" />
          <span className="text-muted-foreground">with the workspace name {workspace.name}.</span>
        </div>
      </Section>

      <FileDeleteDialog files={deleting} open={deleting.length > 0} onOpenChange={(o) => !o && setDeleting([])} />
      <ConfirmDialog
        open={pruneOpen}
        onOpenChange={setPruneOpen}
        title={`Prune ${num(prunable.length)} old version${prunable.length === 1 ? "" : "s"}?`}
        description={`Versions older than ${days} days are removed permanently and ${bytes(prunableBytes)} is reclaimed. Current versions stay.`}
        confirmLabel="Prune versions"
        destructive
        onConfirm={() => {
          const reclaimed = pruneVersions(Number(days))
          toast.success(`Reclaimed ${bytes(reclaimed)}`, { description: `Versions older than ${days} days removed.` })
        }}
      />
    </div>
  )
}
