"use client"

import type { Column } from "@tanstack/react-table"
import type { FileRecord, Folder, KnowledgeBase, Source } from "@/lib/mock/types"

/** Sources that include a file and the knowledge bases reached through them. */
export function fileUsage(file: FileRecord, sources: Source[], kbs: KnowledgeBase[]) {
  const srcs = sources.filter((s) => file.usedBySourceIds.includes(s.id))
  const kbIds = Array.from(new Set(srcs.flatMap((s) => s.usedByKbIds)))
  const reached = kbs.filter((k) => kbIds.includes(k.id))
  return { sources: srcs, kbs: reached }
}

export function usageLabel(nSources: number, nKbs: number) {
  return `${nSources} source${nSources === 1 ? "" : "s"} · ${nKbs} KB${nKbs === 1 ? "" : "s"}`
}

/** Folder ids from the root down to `id`, inclusive. */
export function folderPath(id: string | null, folders: Folder[]): Folder[] {
  const out: Folder[] = []
  let cur = folders.find((f) => f.id === id)
  while (cur) {
    out.unshift(cur)
    cur = folders.find((f) => f.id === cur!.parentId)
  }
  return out
}

/** `id` and every folder below it. */
export function descendantIds(id: string, folders: Folder[]): string[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) folders.filter((f) => f.parentId === out[i]).forEach((f) => out.push(f.id))
  return out
}

export function folderLabel(id: string | null, folders: Folder[]) {
  if (!id) return "All files"
  return folderPath(id, folders).map((f) => f.name).join(" / ")
}

export type MimeGroup = "PDF" | "Documents" | "Spreadsheets" | "Presentations" | "Images" | "Text"

export function mimeGroup(mime: string): MimeGroup {
  if (mime === "application/pdf") return "PDF"
  if (mime.includes("wordprocessingml")) return "Documents"
  if (mime.includes("spreadsheetml") || mime === "text/csv") return "Spreadsheets"
  if (mime.includes("presentationml")) return "Presentations"
  if (mime.startsWith("image/")) return "Images"
  return "Text"
}

export function previewKind(mime: string): "pdf" | "office" | "sheet" | "image" | "csv" | "text" {
  if (mime === "application/pdf") return "pdf"
  if (mime.includes("spreadsheetml")) return "sheet"
  if (mime.includes("wordprocessingml") || mime.includes("presentationml")) return "office"
  if (mime.startsWith("image/")) return "image"
  if (mime === "text/csv") return "csv"
  return "text"
}

/** " (2)" goes before the extension so the type stays recognisable. */
export function keepBothName(name: string, taken: string[]) {
  const dot = name.lastIndexOf(".")
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ""
  let n = 2
  while (taken.includes(`${stem} (${n})${ext}`)) n++
  return `${stem} (${n})${ext}`
}

export function parseCsv(text: string, limit = 200): string[][] {
  return text.split("\n").filter(Boolean).slice(0, limit + 1).map((l) => l.split(","))
}

/**
 * Adapter so the shared faceted-filter popover can drive filters kept in page state, which the
 * list and grid views both read.
 */
export function stateColumn(values: string[], setValues: (v: string[]) => void, counts: Map<string, number>) {
  return {
    getFacetedUniqueValues: () => counts,
    getFilterValue: () => (values.length ? values : undefined),
    setFilterValue: (v: string[] | undefined) => setValues(v ?? []),
  } as unknown as Column<FileRecord, unknown>
}
