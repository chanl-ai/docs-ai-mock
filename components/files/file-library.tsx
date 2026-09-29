"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Eye, FilePlus2, FolderInput, FolderPlus, FolderTree as FolderTreeIcon, LayoutGrid, MoreHorizontal, Pencil, Rows3, Search, Tags, Trash2, Upload, X, Replace, HardDrive, Upload as UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { EmptyState, NoResults, PageStateGate, TableSkeleton } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { MimeIcon } from "@/components/shared/status-badge"
import { DataTableFacetedFilter } from "@/components/knowledge-base/data-table-faceted-filter"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { bytes, mimeLabel, relative } from "@/lib/format"
import type { FileRecord, Folder } from "@/lib/mock/types"
import { FolderTree, DRAG_MIME } from "./folder-tree"
import { UploadDialog } from "./upload-dialog"
import { FileDetailSheet } from "./file-detail-sheet"
import { AddToSourceDialog, FileDeleteDialog, FolderNameDialog, MoveDialog, RenameFileDialog, ReplaceDialog, TagsDialog } from "./file-dialogs"
import { descendantIds, fileUsage, folderLabel, folderPath, stateColumn, usageLabel } from "./file-utils"

type Pending =
  | { kind: "move" | "tags" | "source" | "delete"; files: FileRecord[] }
  | { kind: "rename" | "replace"; files: [FileRecord] }
  | null

export function FileLibrary({ openFileId }: { openFileId?: string }) {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { base, workspace } = useWs()
  const { admin } = useRole()
  const user = useMock((s) => s.user)
  const folders = useMock((s) => s.folders)
  const allFiles = useMock((s) => s.files)
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const moveFiles = useMock((s) => s.moveFiles)
  const deleteFolder = useMock((s) => s.deleteFolder)

  const folderId = params.get("folder")
  const currentFolder = folders.find((f) => f.id === folderId) ?? null
  const [view, setView] = useState<"list" | "grid">("list")
  const [q, setQ] = useState("")
  const [types, setTypes] = useState<string[]>([])
  const [tagsF, setTagsF] = useState<string[]>([])
  const [usedBy, setUsedBy] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(params.get("upload") === "1")
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<Folder | undefined>()
  const [deletingFolder, setDeletingFolder] = useState<Folder | undefined>()
  const [treeOpen, setTreeOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | undefined>(openFileId)
  const [pending, setPending] = useState<Pending>(null)

  const full = workspace.storageUsedBytes >= workspace.storageQuotaBytes
  const filesSource = state === "empty" ? [] : allFiles

  const inFolder = useMemo(() => {
    if (!currentFolder) return filesSource
    const ids = descendantIds(currentFolder.id, folders)
    return filesSource.filter((f) => f.folderId && ids.includes(f.folderId))
  }, [filesSource, currentFolder, folders])

  const filtered = inFolder.filter((f) => {
    if (q && !`${f.name} ${f.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false
    if (types.length && !types.includes(mimeLabel(f.mimeType))) return false
    if (tagsF.length && !f.tags.some((t) => tagsF.includes(t))) return false
    if (usedBy.length && !usedBy.includes(f.usedBySourceIds.length ? "used" : "unused")) return false
    return true
  })
  const isFiltered = !!q || types.length > 0 || tagsF.length > 0 || usedBy.length > 0
  const clear = () => { setQ(""); setTypes([]); setTagsF([]); setUsedBy([]) }

  const facet = (fn: (f: FileRecord) => string[]) => {
    const m = new Map<string, number>()
    inFolder.forEach((f) => fn(f).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1)))
    return m
  }
  const typeCounts = facet((f) => [mimeLabel(f.mimeType)])
  const tagCounts = facet((f) => f.tags)
  const usedCounts = facet((f) => [f.usedBySourceIds.length ? "used" : "unused"])

  const canEdit = (f: FileRecord) => admin || f.uploadedBy === user.name
  const canDelete = (f: FileRecord) => admin || (f.uploadedBy === user.name && f.usedBySourceIds.length === 0)

  const goFolder = (id: string | null) => {
    setTreeOpen(false)
    router.push(id ? `${base}/files?folder=${id}` : `${base}/files`)
  }
  const openDetail = (f: FileRecord) => setDetailId(f.id)
  const closeDetail = () => {
    setDetailId(undefined)
    if (pathname !== `${base}/files`) router.replace(`${base}/files${folderId ? `?folder=${folderId}` : ""}`)
  }
  const dropFiles = (ids: string[], target: string | null) => {
    moveFiles(ids, target)
    toast.success(`Moved ${ids.length === 1 ? allFiles.find((f) => f.id === ids[0])?.name : `${ids.length} files`}`, { description: `To ${folderLabel(target, folders)}` })
  }
  const askDeleteFolder = (f: Folder) => {
    const hasContent = allFiles.some((x) => x.folderId === f.id) || folders.some((x) => x.parentId === f.id)
    if (hasContent) return toast.error("Move contents first", { description: `${f.name} still holds files or folders.` })
    setDeletingFolder(f)
  }

  const usageCell = (f: FileRecord) => {
    const u = fileUsage(f, sources, kbs)
    if (!u.sources.length) return <span className="text-xs text-muted-foreground">Not used</span>
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-default whitespace-nowrap font-normal">{usageLabel(u.sources.length, u.kbs.length)}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-medium">Sources</p>
            <ul>{u.sources.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
            {u.kbs.length > 0 && (
              <>
                <p className="pt-1 font-medium">Knowledge bases</p>
                <ul>{u.kbs.map((k) => <li key={k.id}>{k.name}</li>)}</ul>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  const rowMenu = (f: FileRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${f.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openDetail(f)}><Eye className="size-4" /> Preview</DropdownMenuItem>
        {canEdit(f) && <DropdownMenuItem onClick={() => setPending({ kind: "rename", files: [f] })}><Pencil className="size-4" /> Rename</DropdownMenuItem>}
        {canEdit(f) && <DropdownMenuItem onClick={() => setPending({ kind: "move", files: [f] })}><FolderInput className="size-4" /> Move</DropdownMenuItem>}
        {canEdit(f) && <DropdownMenuItem onClick={() => setPending({ kind: "replace", files: [f] })}><Replace className="size-4" /> Replace</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => toast.message("Downloading", { description: `${f.name} · ${bytes(f.sizeBytes)}` })}><Download className="size-4" /> Download</DropdownMenuItem>
        {canEdit(f) && <DropdownMenuItem onClick={() => setPending({ kind: "tags", files: [f] })}><Tags className="size-4" /> Add tags</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => setPending({ kind: "source", files: [f] })}><FilePlus2 className="size-4" /> Add to source</DropdownMenuItem>
        {canDelete(f) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setPending({ kind: "delete", files: [f] })}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const dragProps = (f: FileRecord) => ({
    draggable: canEdit(f),
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify([f.id]))
      e.dataTransfer.effectAllowed = "move"
    },
  })

  const columns = useMemo<ColumnDef<FileRecord>[]>(
    () => [
      selectColumn<FileRecord>(),
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const f = row.original
          const showFolder = f.folderId !== (currentFolder?.id ?? null)
          return (
            <div className="flex min-w-[180px] max-w-[210px] items-center gap-2" {...dragProps(f)}>
              <MimeIcon mime={f.mimeType} />
              <div className="min-w-0">
                <button type="button" className="block max-w-full truncate text-left font-medium hover:underline" onClick={(e) => { e.stopPropagation(); openDetail(f) }}>{f.name}</button>
                {showFolder && f.folderId && <div className="truncate text-[11px] text-muted-foreground">{folderLabel(f.folderId, folders)}</div>}
              </div>
            </div>
          )
        },
      },
      { accessorKey: "sizeBytes", header: ({ column }) => <SortHeader column={column} title="Size" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="whitespace-nowrap">{bytes(row.original.sizeBytes)}</span> },
      { id: "type", accessorFn: (r) => mimeLabel(r.mimeType), header: "Type", cell: ({ row }) => <span className="text-muted-foreground">{mimeLabel(row.original.mimeType)}</span> },
      { accessorKey: "version", header: ({ column }) => <SortHeader column={column} title="Version" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="font-mono text-xs">v{row.original.version}</span> },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 whitespace-nowrap">
            {row.original.tags.slice(0, 1).map((t) => <Badge key={t} variant="secondary" className="max-w-[110px] truncate font-normal">{t}</Badge>)}
            {row.original.tags.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild><Badge variant="outline" className="cursor-default font-normal">+{row.original.tags.length - 1}</Badge></TooltipTrigger>
                <TooltipContent>{row.original.tags.slice(1).join(", ")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      },
      { id: "usedBy", accessorFn: (r) => r.usedBySourceIds.length, header: "Used by", cell: ({ row }) => usageCell(row.original) },
      { accessorKey: "uploadedBy", header: "Uploaded by", cell: ({ row }) => { const [a, b] = row.original.uploadedBy.split(" "); return <span className="whitespace-nowrap" title={row.original.uploadedBy}>{b ? `${a} ${b[0]}.` : a}</span> } },
      { accessorKey: "modifiedAt", header: ({ column }) => <SortHeader column={column} title="Modified" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.modifiedAt)}</span> },
      { id: "actions", header: "", enableHiding: false, size: 40, cell: ({ row }) => <div onClick={(e) => e.stopPropagation()} className="text-right">{rowMenu(row.original)}</div> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentFolder, folders, sources, kbs, admin, user.name]
  )

  const uploadButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={full ? 0 : -1}>
          <Button size="sm" onClick={() => setUploadOpen(true)} disabled={full}><Upload className="size-4" /> Upload</Button>
        </span>
      </TooltipTrigger>
      {full && <TooltipContent>Storage is full. Free space or request more from Storage.</TooltipContent>}
    </Tooltip>
  )

  const quota = workspace.storageQuotaBytes
  const used = workspace.storageUsedBytes
  const rail = (
    <div className="flex flex-col gap-4">
      <FolderTree
        folders={folders}
        files={filesSource}
        currentId={currentFolder?.id ?? null}
        onSelect={goFolder}
        onDropFiles={dropFiles}
        onRename={admin ? (f) => setRenamingFolder(f) : undefined}
        onDelete={admin ? askDeleteFolder : undefined}
      />
      <div className="space-y-1.5 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Storage</span>
          <span className="tabular-nums text-muted-foreground">{bytes(used)} of {bytes(quota)}</span>
        </div>
        <Progress value={Math.min(100, (used / quota) * 100)} className="h-1.5" aria-label="Storage used" />
        <Link href={`${base}/files/storage`} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Manage storage</Link>
      </div>
    </div>
  )

  const crumbs = folderPath(currentFolder?.id ?? null, folders)

  const content = () => {
    if (inFolder.length === 0) {
      return (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={UploadIcon}
            title={currentFolder ? `${currentFolder.name} is empty` : "No files yet"}
            description="The library keeps every uploaded file in one place so several sources can reuse it. Drop files here or Upload."
            action={full ? undefined : { label: "Upload files", onClick: () => setUploadOpen(true) }}
            secondaryAction={{ label: "New folder", onClick: () => setNewFolderOpen(true) }}
          />
        </div>
      )
    }
    const noResults = (
      <div className="rounded-md border">
        <NoResults onClear={clear} />
      </div>
    )
    if (view === "grid") {
      if (!filtered.length) return noResults
      return (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((f) => (
            <li key={f.id} className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/40" {...dragProps(f)}>
              <button type="button" onClick={() => openDetail(f)} className="block w-full text-left">
                <div className="flex aspect-[4/3] items-center justify-center border-b bg-muted/40">
                  {f.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.imageDataUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <MimeIcon mime={f.mimeType} className="size-10" />
                  )}
                </div>
                <div className="space-y-0.5 p-3 pr-10">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="truncate text-xs tabular-nums text-muted-foreground">{mimeLabel(f.mimeType)} · {bytes(f.sizeBytes)} · v{f.version}</p>
                </div>
              </button>
              <div className="absolute bottom-2 right-1">{rowMenu(f)}</div>
            </li>
          ))}
        </ul>
      )
    }
    return (
      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={openDetail}
        hideViewOptions
        emptyState={noResults}
        initialSorting={[{ id: "modifiedAt", desc: true }]}
        bulkActions={[
          { label: "Move", icon: FolderInput, onClick: (rows) => setPending({ kind: "move", files: rows.filter(canEdit) }) },
          { label: "Tag", icon: Tags, onClick: (rows) => setPending({ kind: "tags", files: rows.filter(canEdit) }) },
          { label: "Add to source", icon: FilePlus2, onClick: (rows) => setPending({ kind: "source", files: rows }) },
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive",
            onClick: (rows) => {
              const ok = rows.filter(canDelete)
              if (!ok.length) return toast.error("None of these can be deleted", { description: "Files used by a source can only be deleted by an admin." })
              if (ok.length < rows.length) toast.message(`${rows.length - ok.length} skipped`, { description: "Files used by a source can only be deleted by an admin." })
              setPending({ kind: "delete", files: ok })
            },
          },
        ]}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Files"
        description="Every uploaded file in one place. Sources read files from here, so one file can feed several knowledge bases and be replaced in one move."
        actions={
          <>
            <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setTreeOpen(true)}><FolderTreeIcon className="size-4" /> Folders</Button>
            <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)}><FolderPlus className="size-4" /> New folder</Button>
            {uploadButton}
          </>
        }
      />

      {full && (
        <Alert variant="destructive">
          <HardDrive className="size-4" />
          <AlertTitle>Storage is full</AlertTitle>
          <AlertDescription>
            <p>Uploads are paused until space is freed. Delete unused files or prune old versions, or request more storage.</p>
            <Button asChild size="sm" variant="outline" className="mt-2"><Link href={`${base}/files/storage`}>Open Storage</Link></Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <ScrollArea className="max-h-[calc(100vh-10rem)]">{rail}</ScrollArea>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {crumbs.length ? <BreadcrumbLink asChild><Link href={`${base}/files`}>All files</Link></BreadcrumbLink> : <BreadcrumbPage>All files</BreadcrumbPage>}
              </BreadcrumbItem>
              {crumbs.map((c, i) => (
                <span key={c.id} className="contents">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {i === crumbs.length - 1 ? <BreadcrumbPage>{c.name}</BreadcrumbPage> : <BreadcrumbLink asChild><Link href={`${base}/files?folder=${c.id}`}>{c.name}</Link></BreadcrumbLink>}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <PageStateGate state={state} loading={<TableSkeleton cols={7} />}>
            {inFolder.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Search files and tags…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-[200px] pl-8 lg:w-[260px]" aria-label="Search files" />
                </div>
                <DataTableFacetedFilter column={stateColumn(types, setTypes, typeCounts)} title="Type" options={Array.from(typeCounts.keys()).sort().map((t) => ({ label: t, value: t }))} />
                <DataTableFacetedFilter column={stateColumn(tagsF, setTagsF, tagCounts)} title="Tag" options={Array.from(tagCounts.keys()).sort().map((t) => ({ label: t, value: t }))} />
                <DataTableFacetedFilter column={stateColumn(usedBy, setUsedBy, usedCounts)} title="Used by" options={[{ label: "Used by a source", value: "used" }, { label: "Not used", value: "unused" }]} />
                {isFiltered && <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clear}>Reset <X className="size-3.5" /></Button>}
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{filtered.length} of {inFolder.length}</span>
                  <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as typeof view)} variant="outline" size="sm">
                    <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 p-0"><Rows3 className="size-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0"><LayoutGrid className="size-4" /></ToggleGroupItem>
                  </ToggleGroup>
                </span>
              </div>
            )}
            {content()}
          </PageStateGate>
        </div>
      </div>

      <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
        <SheetContent side="left" className="w-full gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="border-b">
            <SheetTitle>Folders</SheetTitle>
            <SheetDescription>Pick a folder, or drag a file onto one to move it.</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-3">{rail}</div>
        </SheetContent>
      </Sheet>

      <UploadDialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o && params.get("upload")) router.replace(`${base}/files${folderId ? `?folder=${folderId}` : ""}`) }} folderId={currentFolder?.id ?? null} />
      <FolderNameDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} parentId={currentFolder?.id ?? null} />
      <FolderNameDialog open={!!renamingFolder} onOpenChange={(o) => !o && setRenamingFolder(undefined)} parentId={renamingFolder?.parentId ?? null} folder={renamingFolder} />
      <ConfirmDialog
        open={!!deletingFolder}
        onOpenChange={(o) => !o && setDeletingFolder(undefined)}
        title={`Delete ${deletingFolder?.name}?`}
        description="The folder is empty. Nothing else is affected."
        confirmLabel="Delete folder"
        destructive
        onConfirm={() => {
          if (!deletingFolder) return
          if (!deleteFolder(deletingFolder.id)) toast.error("Move contents first")
          else {
            toast.success("Folder deleted", { description: deletingFolder.name })
            if (currentFolder?.id === deletingFolder.id) goFolder(deletingFolder.parentId)
          }
          setDeletingFolder(undefined)
        }}
      />

      <FileDetailSheet fileId={detailId} open={!!detailId} onOpenChange={(o) => !o && closeDetail()} />
      <MoveDialog files={pending?.kind === "move" ? pending.files : []} open={pending?.kind === "move" && pending.files.length > 0} onOpenChange={(o) => !o && setPending(null)} />
      <TagsDialog files={pending?.kind === "tags" ? pending.files : []} open={pending?.kind === "tags" && pending.files.length > 0} onOpenChange={(o) => !o && setPending(null)} />
      <AddToSourceDialog files={pending?.kind === "source" ? pending.files : []} open={pending?.kind === "source"} onOpenChange={(o) => !o && setPending(null)} />
      <RenameFileDialog file={pending?.kind === "rename" ? pending.files[0] : undefined} open={pending?.kind === "rename"} onOpenChange={(o) => !o && setPending(null)} />
      <ReplaceDialog file={pending?.kind === "replace" ? pending.files[0] : undefined} open={pending?.kind === "replace"} onOpenChange={(o) => !o && setPending(null)} />
      <FileDeleteDialog files={pending?.kind === "delete" ? pending.files : []} open={pending?.kind === "delete"} onOpenChange={(o) => !o && setPending(null)} />
    </div>
  )
}
