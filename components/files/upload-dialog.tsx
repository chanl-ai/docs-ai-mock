"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TagInput } from "@/components/shared/tag-input"
import { SourceTypeIcon } from "@/lib/mock/source-types"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { bytes } from "@/lib/format"
import { FileDropzone, UploadRowList, useUploadRunner, type UploadRow } from "./file-dropzone"
import { folderLabel, keepBothName } from "./file-utils"

const ROOT = "__root"

export function UploadDialog({ open, onOpenChange, folderId }: { open: boolean; onOpenChange: (o: boolean) => void; folderId: string | null }) {
  const { base, workspace } = useWs()
  const folders = useMock((s) => s.folders)
  const files = useMock((s) => s.files)
  const user = useMock((s) => s.user)
  const allSources = useMock((s) => s.sources)
  const addFile = useMock((s) => s.addFile)
  const addFileVersion = useMock((s) => s.addFileVersion)
  const addFilesToSource = useMock((s) => s.addFilesToSource)
  const fileSources = allSources.filter((s) => s.type === "file")

  const [rows, setRowsState] = useState<UploadRow[]>([])
  const [target, setTarget] = useState<string>(folderId ?? ROOT)
  const [tags, setTags] = useState<string[]>([])
  const [toSource, setToSource] = useState(false)
  const [sourceId, setSourceId] = useState<string>("")
  const [phase, setPhase] = useState<"select" | "uploading" | "finished">("select")
  const [replaceOf, setReplaceOf] = useState<Record<string, string>>({})
  const [confirmClose, setConfirmClose] = useState(false)
  const [result, setResult] = useState<{ uploaded: number; rejected: number; sourceId?: string } | null>(null)
  const committed = useRef(false)

  const setRows = (fn: (r: UploadRow[]) => UploadRow[]) => setRowsState(fn)
  const { cancel, retry } = useUploadRunner(rows, setRows, phase === "uploading")

  const folderIdValue = target === ROOT ? null : target
  const namesInFolder = useMemo(() => files.filter((f) => f.folderId === folderIdValue).map((f) => f.name), [files, folderIdValue])

  useEffect(() => {
    if (open) {
      setTarget(folderId ?? ROOT)
    }
  }, [open, folderId])

  // Changing the target folder re-checks every queued row for a name clash there.
  const changeTarget = (t: string) => {
    setTarget(t)
    const names = files.filter((f) => f.folderId === (t === ROOT ? null : t)).map((f) => f.name)
    setReplaceOf({})
    setRowsState((rs) => rs.map((r) => (r.status === "queued" ? { ...r, duplicateOf: names.includes(r.name) ? r.name : undefined } : r)))
  }

  const reset = () => {
    setRowsState([])
    setTags([])
    setToSource(false)
    setSourceId("")
    setPhase("select")
    setReplaceOf({})
    setResult(null)
    committed.current = false
  }

  const commit = (finalRows: UploadRow[]) => {
    if (committed.current) return
    committed.current = true
    const done = finalRows.filter((r) => r.status === "done")
    const ids: string[] = []
    done.forEach((r) => {
      const existing = replaceOf[r.id]
      if (existing) {
        addFileVersion(existing, r.size)
        ids.push(existing)
        return
      }
      const isPdf = r.mime === "application/pdf"
      const rec = addFile({
        name: r.name,
        folderId: folderIdValue,
        sizeBytes: r.size,
        mimeType: r.mime,
        tags,
        uploadedBy: user.name,
        usedBySourceIds: [],
        pageCount: isPdf ? Math.max(1, Math.round(r.size / 60_000)) : undefined,
        textPreview: r.mime.startsWith("image/") ? undefined : `${r.name.replace(/\.[a-z0-9]+$/i, "")}\n\nUploaded by ${user.name}. The first page of the document appears here once the preview is generated.`,
        imageDataUrl: undefined,
      })
      ids.push(rec.id)
    })
    const useSource = toSource && sourceId && ids.length ? sourceId : undefined
    if (useSource) addFilesToSource(ids, useSource)
    const rejected = finalRows.filter((r) => r.status === "rejected" || r.status === "failed").length
    setResult({ uploaded: ids.length, rejected, sourceId: useSource })
    return ids.length
  }

  // Storage full mid-batch: once the finished bytes reach the quota, the rest fail.
  useEffect(() => {
    if (phase !== "uploading") return
    const uploaded = rows.filter((r) => r.status === "done").reduce((n, r) => n + r.size, 0)
    if (workspace.storageUsedBytes + uploaded > workspace.storageQuotaBytes && rows.some((r) => r.status === "queued" || r.status === "uploading")) {
      rows.filter((r) => r.status === "uploading").forEach((r) => cancel(r.id))
      setRowsState((rs) => rs.map((r) => (r.status === "queued" || r.status === "uploading" || r.status === "cancelled" ? { ...r, status: "failed", reason: "Storage full", progress: 0 } : r)))
      return
    }
    if (rows.length && !rows.some((r) => r.status === "queued" || r.status === "uploading")) {
      commit(rows)
      setPhase("finished")
    }
  }, [rows, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const queued = rows.filter((r) => r.status === "queued").length
  const live = rows.filter((r) => r.status !== "rejected")
  const total = live.length ? live.reduce((n, r) => n + (r.status === "done" ? 100 : r.progress), 0) / live.length : 0
  const busy = phase === "uploading"
  const unresolved = rows.filter((r) => r.status === "queued" && r.duplicateOf).length

  const requestClose = (o: boolean) => {
    if (o) return onOpenChange(true)
    if (busy) return setConfirmClose(true)
    reset()
    onOpenChange(false)
  }

  const resolveDuplicate = (id: string, how: "replace" | "keep") => {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    if (how === "replace") {
      const existing = files.find((f) => f.folderId === folderIdValue && f.name === row.name)
      if (existing) setReplaceOf((m) => ({ ...m, [id]: existing.id }))
      setRowsState((rs) => rs.map((r) => (r.id === id ? { ...r, duplicateOf: undefined, reason: undefined } : r)))
    } else {
      const taken = [...namesInFolder, ...rows.map((r) => r.name)]
      setRowsState((rs) => rs.map((r) => (r.id === id ? { ...r, name: keepBothName(r.name, taken), duplicateOf: undefined } : r)))
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>Files land in the library first. A source turns them into searchable items.</DialogDescription>
          </DialogHeader>

          <div className="-mx-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-6">
            {phase === "select" ? (
              <FileDropzone rows={[]} onChange={(added) => setRowsState((rs) => [...rs, ...added])} existingNames={namesInFolder} />
            ) : null}

            {phase === "select" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-folder">Folder</Label>
                  <Select value={target} onValueChange={changeTarget}>
                    <SelectTrigger id="upload-folder" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT}>All files (top level)</SelectItem>
                      {folders.map((f) => <SelectItem key={f.id} value={f.id}>{folderLabel(f.id, folders)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-tags">Tags for every file</Label>
                  <TagInput id="upload-tags" value={tags} onChange={setTags} suggestions={Array.from(new Set(files.flatMap((f) => f.tags))).sort()} placeholder="policy, hr…" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="upload-to-source" checked={toSource} onCheckedChange={(v) => setToSource(!!v)} />
                    <Label htmlFor="upload-to-source" className="font-normal">Add to a source after upload</Label>
                  </div>
                  {toSource && (
                    <Select value={sourceId} onValueChange={setSourceId}>
                      <SelectTrigger className="w-full sm:w-80" aria-label="Source"><SelectValue placeholder="Choose a file source" /></SelectTrigger>
                      <SelectContent>
                        {fileSources.map((s) => <SelectItem key={s.id} value={s.id}><SourceTypeIcon type={s.type} /> {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

            <UploadRowList
              rows={rows}
              onRemove={(id) => setRowsState((rs) => rs.filter((r) => r.id !== id))}
              onCancel={cancel}
              onRetry={phase === "finished" ? undefined : retry}
              onResolveDuplicate={phase === "select" ? resolveDuplicate : undefined}
            />

            {result && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {result.uploaded} uploaded, {result.rejected} rejected
                  {result.sourceId && <span className="text-muted-foreground">· added to {allSources.find((s) => s.id === result.sourceId)?.name}</span>}
                </span>
                {result.sourceId && (
                  <Button asChild size="sm" variant="outline" className="h-7">
                    <Link href={`${base}/sources/${result.sourceId}`}>View source</Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            {phase !== "select" && (
              <div className="flex items-center gap-3">
                <Progress value={total} className="h-1.5 flex-1" aria-label="Total progress" />
                <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">{Math.round(total)}% · {bytes(live.filter((r) => r.status === "done").reduce((n, r) => n + r.size, 0))}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {phase === "finished" ? (
                <>
                  <Button variant="outline" onClick={() => reset()}>Upload more</Button>
                  <Button onClick={() => requestClose(false)}>Done</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => requestClose(false)}>{busy ? "Cancel uploads" : "Cancel"}</Button>
                  <Button
                    disabled={busy || queued === 0 || (toSource && !sourceId)}
                    onClick={() => {
                      // Unresolved duplicates default to keeping both.
                      if (unresolved) {
                        const taken = [...namesInFolder, ...rows.map((r) => r.name)]
                        setRowsState((rs) => rs.map((r) => (r.status === "queued" && r.duplicateOf ? { ...r, name: keepBothName(r.name, taken), duplicateOf: undefined } : r)))
                      }
                      setPhase("uploading")
                    }}
                  >
                    {busy ? "Uploading…" : `Upload ${queued} file${queued === 1 ? "" : "s"}`}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop uploading?</AlertDialogTitle>
            <AlertDialogDescription>Uploads in progress will be cancelled. Files that already finished stay in the library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep uploading</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                rows.filter((r) => r.status === "uploading" || r.status === "queued").forEach((r) => cancel(r.id))
                const n = commit(rows)
                if (n) toast.message(`${n} file${n === 1 ? "" : "s"} uploaded before cancelling`)
                reset()
                onOpenChange(false)
              }}
            >
              Cancel uploads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
