"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, X, RotateCcw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MimeIcon } from "@/components/shared/status-badge"
import { bytes } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface UploadRow {
  id: string
  name: string
  size: number
  mime: string
  progress: number // 0..100
  status: "queued" | "uploading" | "done" | "rejected" | "failed" | "cancelled"
  reason?: string
  duplicateOf?: string
}

export const ACCEPTED = [".pdf", ".docx", ".xlsx", ".pptx", ".csv", ".txt", ".md", ".html"]
export const MAX_BYTES = 50 * 1024 * 1024
export const MAX_FILES = 100

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
}

export function rowsFromFiles(files: File[], accept = ACCEPTED, existingNames: string[] = []): UploadRow[] {
  return files.slice(0, MAX_FILES).map((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
    const ok = accept.includes(`.${ext}`)
    const tooBig = f.size > MAX_BYTES
    return {
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      mime: MIME_BY_EXT[ext] ?? f.type ?? "application/octet-stream",
      progress: 0,
      status: !ok ? "rejected" : tooBig ? "rejected" : "queued",
      reason: !ok ? `.${ext} is not an accepted type` : tooBig ? `${bytes(f.size)} is over the 50 MB limit` : undefined,
      duplicateOf: existingNames.includes(f.name) ? f.name : undefined,
    }
  })
}

/** Sample batch for the demo "Add sample files" button: two get rejected on purpose. */
export function sampleRows(existingNames: string[] = []): UploadRow[] {
  const names: [string, number][] = [
    ["Parental leave policy 2026.pdf", 1_240_000],
    ["Expense reimbursement policy.pdf", 880_000],
    ["Travel policy.docx", 240_000],
    ["Benefits guide 2026.pdf", 4_100_000],
    ["Code of conduct.pdf", 610_000],
    ["Remote work allowance.pdf", 320_000],
    ["Onboarding checklist.docx", 140_000],
    ["Vacation policy.pdf", 410_000],
    ["Town hall recording.zip", 92_000_000],
    ["Org chart Q3 2026.pptx", 62_000_000],
    ["Whistleblower policy.pdf", 220_000],
    ["Performance review cycle.pdf", 380_000],
  ]
  return names.map(([name, size]) => {
    const ext = name.split(".").pop()!
    const ok = ACCEPTED.includes(`.${ext}`)
    const tooBig = size > MAX_BYTES
    return {
      id: `${name}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      size,
      mime: MIME_BY_EXT[ext] ?? "application/octet-stream",
      progress: 0,
      status: !ok || tooBig ? "rejected" : "queued",
      reason: !ok ? `.${ext} is not an accepted type` : tooBig ? `${bytes(size)} is over the 50 MB limit` : undefined,
      duplicateOf: existingNames.includes(name) ? name : undefined,
    }
  })
}

/**
 * Drives uploads for the rows: three at a time, progress events every 120 ms.
 * Returns a cancel function per row.
 */
export function useUploadRunner(rows: UploadRow[], setRows: (fn: (r: UploadRow[]) => UploadRow[]) => void, active: boolean) {
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  useEffect(() => {
    if (!active) return
    const uploading = rows.filter((r) => r.status === "uploading").length
    const queued = rows.filter((r) => r.status === "queued")
    const toStart = queued.slice(0, Math.max(0, 3 - uploading))
    toStart.forEach((row) => {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: "uploading" } : r)))
      const step = Math.max(4, Math.min(25, 4_000_000 / Math.max(row.size, 1)))
      timers.current[row.id] = setInterval(() => {
        setRows((rs) =>
          rs.map((r) => {
            if (r.id !== row.id || r.status !== "uploading") return r
            const p = Math.min(100, r.progress + step + Math.random() * 6)
            if (p >= 100) {
              clearInterval(timers.current[row.id])
              return { ...r, progress: 100, status: "done" }
            }
            return { ...r, progress: p }
          })
        )
      }, 120)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => r.status).join(","), active])

  useEffect(() => () => Object.values(timers.current).forEach(clearInterval), [])

  const cancel = (id: string) => {
    clearInterval(timers.current[id])
    setRows((rs) => rs.map((r) => (r.id === id && (r.status === "uploading" || r.status === "queued") ? { ...r, status: "cancelled", progress: 0 } : r)))
  }
  const retry = (id: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "queued", progress: 0, reason: undefined } : r)))
  return { cancel, retry }
}

export function UploadRowList({ rows, onRemove, onCancel, onRetry, onResolveDuplicate }: { rows: UploadRow[]; onRemove: (id: string) => void; onCancel?: (id: string) => void; onRetry?: (id: string) => void; onResolveDuplicate?: (id: string, how: "replace" | "keep") => void }) {
  if (!rows.length) return null
  return (
    <ul className="divide-y rounded-md border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2">
          <MimeIcon mime={r.mime} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm">{r.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{bytes(r.size)}</span>
            </div>
            {r.status === "uploading" && <Progress value={r.progress} className="mt-1 h-1" />}
            {r.status === "rejected" && <p className="text-xs text-destructive">{r.reason}</p>}
            {r.status === "failed" && <p className="text-xs text-destructive">{r.reason ?? "Upload failed"}</p>}
            {r.status === "cancelled" && <p className="text-xs text-muted-foreground">Cancelled</p>}
            {r.duplicateOf && r.status === "queued" && onResolveDuplicate && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-amber-700 dark:text-amber-300">A file with this name exists in the folder.</span>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onResolveDuplicate(r.id, "replace")}>Replace existing (new version)</Button>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onResolveDuplicate(r.id, "keep")}>Keep both (renamed)</Button>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {r.status === "done" && <CheckCircle2 className="size-4 text-emerald-600" />}
            {r.status === "uploading" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {r.status === "rejected" && <AlertTriangle className="size-4 text-destructive" />}
            {(r.status === "failed" || r.status === "cancelled") && onRetry && (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onRetry(r.id)} aria-label="Retry"><RotateCcw className="size-3.5" /></Button>
            )}
            {r.status === "uploading" && onCancel ? (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onCancel(r.id)} aria-label="Cancel"><X className="size-3.5" /></Button>
            ) : r.status !== "uploading" ? (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onRemove(r.id)} aria-label="Remove"><X className="size-3.5" /></Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Drop area plus row list. `compact` is the inline variant used by the wizard and onboarding. */
export function FileDropzone({ rows, onChange, compact, accept = ACCEPTED, existingNames = [], sampleButton = true }: { rows: UploadRow[]; onChange: (rows: UploadRow[]) => void; compact?: boolean; accept?: string[]; existingNames?: string[]; sampleButton?: boolean }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const add = (files: File[]) => onChange([...rows, ...rowsFromFiles(files, accept, existingNames)])
  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)) }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors", compact ? "px-4 py-6" : "px-6 py-10", over ? "border-primary bg-primary/5" : "border-muted-foreground/30")}
      >
        <Upload className="size-6 text-muted-foreground" />
        <p className="text-sm">
          Drop files here or{" "}
          <button type="button" className="font-medium underline underline-offset-4" onClick={() => inputRef.current?.click()}>browse</button>
        </p>
        <p className="text-xs text-muted-foreground">{accept.join(", ")} · 50 MB each · up to {MAX_FILES} files</p>
        {sampleButton && (
          <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => onChange([...rows, ...sampleRows(existingNames)])}>
            Add 12 sample files
          </Button>
        )}
        <input ref={inputRef} type="file" multiple accept={accept.join(",")} className="hidden" onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = "" }} />
      </div>
      <UploadRowList rows={rows} onRemove={(id) => onChange(rows.filter((r) => r.id !== id))} />
    </div>
  )
}
