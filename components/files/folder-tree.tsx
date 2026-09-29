"use client"

import { useState, type DragEvent } from "react"
import { ChevronRight, Folder as FolderIcon, FolderOpen, HardDrive, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { FileRecord, Folder } from "@/lib/mock/types"
import { cn } from "@/lib/utils"
import { descendantIds, folderPath } from "./file-utils"

export const DRAG_MIME = "application/x-docs-ai-files"

interface FolderTreeProps {
  folders: Folder[]
  files: FileRecord[]
  currentId: string | null
  onSelect: (id: string | null) => void
  onDropFiles: (ids: string[], folderId: string | null) => void
  onRename?: (folder: Folder) => void
  onDelete?: (folder: Folder) => void
}

/** Folder rail: "All files" root, nested Collapsible rows, per-folder counts, rows accept dragged files. */
export function FolderTree({ folders, files, currentId, onSelect, onDropFiles, onRename, onDelete }: FolderTreeProps) {
  const openPath = new Set(folderPath(currentId, folders).map((f) => f.id))
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [over, setOver] = useState<string | null | undefined>(undefined)
  const count = (id: string) => {
    const ids = descendantIds(id, folders)
    return files.filter((f) => f.folderId && ids.includes(f.folderId)).length
  }

  const dropProps = (id: string | null) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME)) return
      e.preventDefault()
      setOver(id)
    },
    onDragLeave: () => setOver(undefined),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setOver(undefined)
      const raw = e.dataTransfer.getData(DRAG_MIME)
      if (raw) onDropFiles(JSON.parse(raw) as string[], id)
    },
  })

  const rowClass = (id: string | null) =>
    cn(
      "group flex h-8 w-full items-center gap-1 rounded-md pr-1 text-sm transition-colors hover:bg-accent",
      currentId === id && "bg-accent font-medium text-accent-foreground",
      over === id && "ring-2 ring-primary ring-inset"
    )

  const renderNode = (folder: Folder, depth: number) => {
    const children = folders.filter((f) => f.parentId === folder.id)
    const isOpen = open[folder.id] ?? openPath.has(folder.id)
    return (
      <Collapsible key={folder.id} open={isOpen} onOpenChange={(o) => setOpen((s) => ({ ...s, [folder.id]: o }))}>
        <div className={rowClass(folder.id)} style={{ paddingLeft: depth * 12 + 4 }} {...dropProps(folder.id)}>
          {children.length ? (
            <CollapsibleTrigger asChild>
              <button type="button" className="flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-foreground/10" aria-label={isOpen ? `Collapse ${folder.name}` : `Expand ${folder.name}`}>
                <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
              </button>
            </CollapsibleTrigger>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <button type="button" onClick={() => onSelect(folder.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-current={currentId === folder.id ? "page" : undefined}>
            {currentId === folder.id ? <FolderOpen className="size-4 shrink-0 text-muted-foreground" /> : <FolderIcon className="size-4 shrink-0 text-muted-foreground" />}
            <span className="truncate">{folder.name}</span>
          </button>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground group-hover:hidden">{count(folder.id)}</span>
          {(onRename || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden size-6 group-hover:inline-flex data-[state=open]:inline-flex" aria-label={`Actions for ${folder.name}`}>
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRename && <DropdownMenuItem onClick={() => onRename(folder)}><Pencil className="size-4" /> Rename</DropdownMenuItem>}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(folder)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {children.length > 0 && <CollapsibleContent>{children.map((c) => renderNode(c, depth + 1))}</CollapsibleContent>}
      </Collapsible>
    )
  }

  return (
    <nav aria-label="Folders" className="flex flex-col gap-0.5">
      <div className={rowClass(null)} style={{ paddingLeft: 4 }} {...dropProps(null)}>
        <span className="size-5 shrink-0" />
        <button type="button" onClick={() => onSelect(null)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-current={currentId === null ? "page" : undefined}>
          <HardDrive className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">All files</span>
        </button>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{files.length}</span>
      </div>
      {folders.filter((f) => f.parentId === null).map((f) => renderNode(f, 1))}
    </nav>
  )
}
