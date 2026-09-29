"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, FolderInput, Minus, Plus, RotateCcw, Trash2, Upload, AlertTriangle, Database, FileStack } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FieldRow, Rows, Row } from "@/components/shared/surface"
import { TagInput } from "@/components/shared/tag-input"
import { CopyButton } from "@/components/shared/copy"
import { EmptyState } from "@/components/shared/states"
import { ItemStatusBadge, KbHealthBadge, MimeIcon } from "@/components/shared/status-badge"
import { KbDot } from "@/components/knowledge/kb-dot"
import { SourceTypeIcon } from "@/lib/mock/source-types"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { useRole } from "@/hooks/use-role"
import { bytes, dateTime, mimeLabel, relative, shortDate } from "@/lib/format"
import type { FileRecord } from "@/lib/mock/types"
import { AddToSourceDialog, FileDeleteDialog, FolderPicker } from "./file-dialogs"
import { fileUsage, folderLabel, parseCsv, previewKind } from "./file-utils"

export function FileDetailSheet({ fileId, open, onOpenChange }: { fileId?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const file = useMock((s) => s.files.find((f) => f.id === fileId))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[720px]">
        {file ? (
          <FileDetail file={file} onClose={() => onOpenChange(false)} />
        ) : (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>File not found</SheetTitle>
              <SheetDescription>It may have been deleted. Close this panel to return to the library.</SheetDescription>
            </SheetHeader>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function FileDetail({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const { base } = useWs()
  const { admin } = useRole()
  const user = useMock((s) => s.user)
  const folders = useMock((s) => s.folders)
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const items = useMock((s) => s.items)
  const allFiles = useMock((s) => s.files)
  const updateFile = useMock((s) => s.updateFile)
  const moveFiles = useMock((s) => s.moveFiles)
  const addFileVersion = useMock((s) => s.addFileVersion)
  const restoreFileVersion = useMock((s) => s.restoreFileVersion)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [name, setName] = useState(file.name)
  useEffect(() => setName(file.name), [file.name])

  const own = file.uploadedBy === user.name
  const canEdit = admin || own
  const usage = fileUsage(file, sources, kbs)
  const canDelete = admin || (own && usage.sources.length === 0)
  const nSrc = usage.sources.length

  const saveName = () => {
    const v = name.trim()
    if (!v || v === file.name) return setName(file.name)
    updateFile(file.id, { name: v })
    toast.success("File renamed", { description: v })
  }

  return (
    <>
      <SheetHeader className="space-y-2 border-b pb-3">
        <div className="flex items-start gap-2 pr-6">
          <MimeIcon mime={file.mimeType} className="mt-1 size-4" />
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-base leading-tight">{file.name}</SheetTitle>
            <SheetDescription className="truncate text-xs">{folderLabel(file.folderId, folders)} · {bytes(file.sizeBytes)} · {mimeLabel(file.mimeType)}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[11px] font-normal">v{file.version}</Badge>
          {file.tags.map((t) => <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>)}
          <span className="text-xs text-muted-foreground">Modified {relative(file.modifiedAt)} by {file.uploadedBy}</span>
        </div>
      </SheetHeader>

      <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="overflow-x-auto border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="versions">Versions <span className="ml-1 tabular-nums text-muted-foreground">{file.versions.length}</span></TabsTrigger>
            <TabsTrigger value="usage">Usage <span className="ml-1 tabular-nums text-muted-foreground">{nSrc}</span></TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="preview" className="p-4">
            <FilePreview file={file} />
          </TabsContent>

          <TabsContent value="versions" className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Every upload is kept as a version until it is pruned from Storage.</p>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => { addFileVersion(file.id, Math.round(file.sizeBytes * (0.9 + Math.random() * 0.3))); toast.success(`Uploaded v${file.version + 1}`, { description: nSrc ? `${nSrc} source${nSrc === 1 ? "" : "s"} reprocessing` : undefined }) }}>
                  <Upload className="size-3.5" /> Upload new version
                </Button>
              )}
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead>Uploaded by</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...file.versions].sort((a, b) => b.n - a.n).map((v) => (
                    <TableRow key={v.n}>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-mono text-xs">v{v.n}</span>
                        {v.n === file.version && <Badge variant="secondary" className="ml-2 font-normal">Current</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{bytes(v.sizeBytes)}</TableCell>
                      <TableCell className="whitespace-nowrap">{v.uploadedBy}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{shortDate(v.at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => toast.message(`Downloading v${v.n}`, { description: file.name })}><Download className="size-3.5" /> Download</Button>
                          {canEdit && v.n !== file.version && (
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => { restoreFileVersion(file.id, v.n); toast.success(`v${v.n} is current again`, { description: `Saved as v${file.version + 1}. ${nSrc ? `${nSrc} source${nSrc === 1 ? "" : "s"} reprocessing.` : ""}` }) }}>
                              <RotateCcw className="size-3.5" /> Make current
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Making a version current reprocesses the file in {nSrc} source{nSrc === 1 ? "" : "s"}.</p>
          </TabsContent>

          <TabsContent value="usage" className="space-y-5 p-4">
            {nSrc === 0 ? (
              <div className="rounded-lg border">
                <EmptyState icon={FileStack} title="Not used by any source" description="A source turns this file into searchable items for the knowledge bases it feeds." action={{ label: "Add to source", onClick: () => setAddOpen(true) }} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Sources that include this file</h3>
                  <div className="rounded-md border">
                    <Rows>
                      {usage.sources.map((s) => {
                        const item = items.find((i) => i.fileId === file.id && i.sourceId === s.id)
                        return (
                          <Row key={s.id} href={`${base}/sources/${s.id}`} leading={<SourceTypeIcon type={s.type} />} title={s.name} description={item ? item.title : "Waiting for the next sync"} trailing={item ? <ItemStatusBadge status={item.status} /> : undefined} />
                        )
                      })}
                    </Rows>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Knowledge bases reached through them</h3>
                  {usage.kbs.length ? (
                    <div className="rounded-md border">
                      <Rows>
                        {usage.kbs.map((k) => (
                          <Row key={k.id} href={`${base}/kb/${k.id}`} leading={<KbDot color={k.color} />} title={k.name} description={<span className="font-mono">{k.slug}</span>} trailing={<KbHealthBadge health={k.health} />} />
                        ))}
                      </Rows>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="size-4" /> The sources are not attached to a knowledge base yet.</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>Add to another source</Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="details" className="p-4">
            {!canEdit && <p className="mb-3 text-xs text-muted-foreground">Uploaded by {file.uploadedBy}. Only they or an admin can change it.</p>}
            <div>
              <FieldRow
                label="Name"
                value={canEdit ? <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} className="h-8" aria-label="File name" /> : file.name}
                wrap
              />
              <FieldRow
                label="Folder"
                wrap
                value={
                  <span className="flex flex-wrap items-center gap-2">
                    {folderLabel(file.folderId, folders)}
                    {canEdit && (
                      <Popover open={moveOpen} onOpenChange={setMoveOpen}>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7"><FolderInput className="size-3.5" /> Move</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          <FolderPicker value={file.folderId} onPick={(id) => { moveFiles([file.id], id); setMoveOpen(false); toast.success("Moved", { description: `To ${folderLabel(id, folders)}` }) }} />
                        </PopoverContent>
                      </Popover>
                    )}
                  </span>
                }
              />
              <FieldRow
                label="Tags"
                wrap
                value={canEdit ? <TagInput value={file.tags} onChange={(tags) => updateFile(file.id, { tags })} suggestions={Array.from(new Set(allFiles.flatMap((f) => f.tags))).sort()} /> : file.tags.length ? <span className="flex flex-wrap gap-1">{file.tags.map((t) => <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>)}</span> : undefined}
              />
              <FieldRow label="Size" value={<span className="tabular-nums">{bytes(file.sizeBytes)}</span>} />
              <FieldRow label="Type" value={<span>{mimeLabel(file.mimeType)} <span className="font-mono text-xs text-muted-foreground">{file.mimeType}</span></span>} />
              <FieldRow label="Checksum" value={<span className="flex items-center gap-1"><span className="truncate font-mono text-xs">{file.checksum}</span><CopyButton text={file.checksum} iconOnly label="Copy checksum" /></span>} />
              <FieldRow label="File id" value={<span className="flex items-center gap-1"><span className="font-mono text-xs">{file.id}</span><CopyButton text={file.id} iconOnly label="Copy file id" /></span>} />
              <FieldRow label="Uploaded by" value={file.uploadedBy} />
              <FieldRow label="Created" value={dateTime(file.createdAt)} />
              <FieldRow label="Modified" value={dateTime(file.modifiedAt)} />
            </div>
            {canDelete && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Delete file</p>
                  <p className="text-xs text-muted-foreground">{nSrc ? `Removes its items from ${usage.kbs.length} knowledge base${usage.kbs.length === 1 ? "" : "s"}.` : "Removes the file and every version."}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-3.5" /> Delete</Button>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <AddToSourceDialog files={[file]} open={addOpen} onOpenChange={setAddOpen} />
      <FileDeleteDialog files={[file]} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={onClose} />
    </>
  )
}

function ZoomControls({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="outline" className="size-8" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} aria-label="Zoom out" disabled={zoom <= 0.5}><Minus className="size-3.5" /></Button>
      <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
      <Button size="icon" variant="outline" className="size-8" onClick={() => setZoom(Math.min(2, zoom + 0.25))} aria-label="Zoom in" disabled={zoom >= 2}><Plus className="size-3.5" /></Button>
    </div>
  )
}

function Unavailable({ file }: { file: FileRecord }) {
  return (
    <Alert>
      <AlertTriangle className="size-4" />
      <AlertTitle>Preview unavailable, download instead</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>No preview could be generated for this {mimeLabel(file.mimeType)} file. The original is unchanged and sources can still read it.</p>
        <Button size="sm" variant="outline" onClick={() => toast.message("Downloading", { description: file.name })}><Download className="size-3.5" /> Download</Button>
      </AlertDescription>
    </Alert>
  )
}

function CsvTable({ text }: { text: string }) {
  const [head, ...body] = parseCsv(text)
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">{head.map((h, i) => <TableHead key={i} className="whitespace-nowrap">{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {body.map((r, i) => (
            <TableRow key={i}>{head.map((_, j) => <TableCell key={j} className="whitespace-nowrap">{r[j] ?? ""}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FilePreview({ file }: { file: FileRecord }) {
  const kind = previewKind(file.mimeType)
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)
  const [generating, setGenerating] = useState(kind === "office" || kind === "sheet")
  useEffect(() => {
    if (kind !== "office" && kind !== "sheet") return
    setGenerating(true)
    const t = setTimeout(() => setGenerating(false), 1200)
    return () => clearTimeout(t)
  }, [file.id, kind])

  if (kind === "pdf") {
    const pages = file.pageCount ?? 1
    const text = page === 1 ? file.textPreview ?? `${file.name.replace(/\.pdf$/i, "")}` : `${file.name.replace(/\.pdf$/i, "")}\n\nPage ${page}\n\n${"The text on this page continues the document. ".repeat(6)}`
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Page</span>
            <Input type="number" min={1} max={pages} value={page} onChange={(e) => setPage(Math.min(pages, Math.max(1, Number(e.target.value) || 1)))} className="h-8 w-16 tabular-nums" aria-label="Page" />
            <span className="tabular-nums text-muted-foreground">of {pages}</span>
          </div>
          <ZoomControls zoom={zoom} setZoom={setZoom} />
        </div>
        <div className="overflow-auto rounded-md border bg-muted/40 p-4" style={{ maxHeight: "65vh" }}>
          <div className="mx-auto aspect-[1/1.3] w-full max-w-[520px] origin-top rounded-sm border bg-background p-6 shadow-sm transition-transform sm:p-8" style={{ transform: `scale(${zoom})` }}>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{text}</pre>
          </div>
        </div>
      </div>
    )
  }

  if (kind === "image") {
    if (!file.imageDataUrl) return <Unavailable file={file} />
    return (
      <div className="space-y-3">
        <div className="flex justify-end"><ZoomControls zoom={zoom} setZoom={setZoom} /></div>
        <div className="overflow-auto rounded-md border bg-muted/40 p-4" style={{ maxHeight: "65vh" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.imageDataUrl} alt={file.name} className="mx-auto origin-top rounded-sm transition-transform" style={{ transform: `scale(${zoom})` }} />
        </div>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Generating preview">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <p className="text-xs text-muted-foreground">Generating a preview…</p>
      </div>
    )
  }

  if (!file.textPreview) return <Unavailable file={file} />
  if (kind === "sheet" || kind === "csv") return <CsvTable text={file.textPreview} />
  return <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-4 font-sans text-sm leading-relaxed">{file.textPreview}</pre>
}
