"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Check, Folder as FolderIcon, HardDrive, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DeleteDialog } from "@/components/shared/dialogs"
import { TagInput } from "@/components/shared/tag-input"
import { SourceTypeIcon } from "@/lib/mock/source-types"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { bytes } from "@/lib/format"
import type { FileRecord, Folder } from "@/lib/mock/types"
import { cn } from "@/lib/utils"
import { fileUsage, folderLabel } from "./file-utils"

/** Command list of folders; used inside a Popover (detail sheet) and a Dialog (row and bulk move). */
export function FolderPicker({ value, onPick }: { value?: string | null; onPick: (id: string | null) => void }) {
  const folders = useMock((s) => s.folders)
  const options = [{ id: null as string | null, label: "All files (top level)" }, ...folders.map((f) => ({ id: f.id as string | null, label: folderLabel(f.id, folders) }))].sort((a, b) => (a.id === null ? -1 : b.id === null ? 1 : a.label.localeCompare(b.label)))
  return (
    <Command className="rounded-md border">
      <CommandInput placeholder="Find a folder…" />
      <CommandList className="max-h-64">
        <CommandEmpty>No folder matches.</CommandEmpty>
        <CommandGroup>
          {options.map((o) => (
            <CommandItem key={o.id ?? "root"} value={o.label} onSelect={() => onPick(o.id)}>
              {o.id === null ? <HardDrive className="size-4 text-muted-foreground" /> : <FolderIcon className="size-4 text-muted-foreground" />}
              <span className="truncate">{o.label}</span>
              <Check className={cn("ml-auto size-4", value === o.id ? "opacity-100" : "opacity-0")} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export function MoveDialog({ files, open, onOpenChange }: { files: FileRecord[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const moveFiles = useMock((s) => s.moveFiles)
  const folders = useMock((s) => s.folders)
  const current = files.length === 1 ? files[0].folderId : undefined
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {files.length === 1 ? files[0].name : `${files.length} files`}</DialogTitle>
          <DialogDescription>Sources keep reading the file after it moves; only its folder changes.</DialogDescription>
        </DialogHeader>
        <FolderPicker
          value={current}
          onPick={(id) => {
            moveFiles(files.map((f) => f.id), id)
            toast.success(`Moved ${files.length === 1 ? files[0].name : `${files.length} files`}`, { description: `To ${folderLabel(id, folders)}` })
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

export function RenameFileDialog({ file, open, onOpenChange }: { file?: FileRecord; open: boolean; onOpenChange: (o: boolean) => void }) {
  const updateFile = useMock((s) => s.updateFile)
  const [name, setName] = useState(file?.name ?? "")
  const [prev, setPrev] = useState(file?.id)
  if (file?.id !== prev) {
    setPrev(file?.id)
    setName(file?.name ?? "")
  }
  const error = !name.trim() ? "Enter a name." : name.length > 200 ? "Use 200 characters or fewer." : undefined
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!file || error) return
            updateFile(file.id, { name: name.trim() })
            toast.success("File renamed", { description: name.trim() })
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Items built from this file keep their titles until the source reprocesses it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="file-name">Name</Label>
            <Input id="file-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-invalid={!!error} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!!error}>Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TagsDialog({ files, open, onOpenChange }: { files: FileRecord[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const updateFile = useMock((s) => s.updateFile)
  const tagFiles = useMock((s) => s.tagFiles)
  const all = useMock((s) => s.files)
  const single = files.length === 1 ? files[0] : undefined
  const [tags, setTags] = useState<string[]>(single?.tags ?? [])
  const [key, setKey] = useState(files.map((f) => f.id).join())
  if (files.map((f) => f.id).join() !== key) {
    setKey(files.map((f) => f.id).join())
    setTags(files.length === 1 ? files[0].tags : [])
  }
  const suggestions = Array.from(new Set(all.flatMap((f) => f.tags))).sort()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{single ? `Tags on ${single.name}` : `Add tags to ${files.length} files`}</DialogTitle>
          <DialogDescription>{single ? "Tags help people find the file and can be copied onto items by the source." : "These tags are added to each file; existing tags stay."}</DialogDescription>
        </DialogHeader>
        <TagInput value={tags} onChange={setTags} suggestions={suggestions} placeholder="policy, lending…" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (single) updateFile(single.id, { tags })
              else tagFiles(files.map((f) => f.id), tags)
              toast.success("Tags saved", { description: single ? single.name : `${files.length} files` })
              onOpenChange(false)
            }}
          >
            Save tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddToSourceDialog({ files, open, onOpenChange }: { files: FileRecord[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { base } = useWs()
  const sources = useMock((s) => s.sources).filter((s) => s.type === "file")
  const addFilesToSource = useMock((s) => s.addFilesToSource)
  const [sourceId, setSourceId] = useState<string>("")
  const label = files.length === 1 ? files[0].name : `${files.length} files`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {label} to a source</DialogTitle>
          <DialogDescription>A file source turns files into items and feeds them to the knowledge bases it is attached to.</DialogDescription>
        </DialogHeader>
        {sources.length ? (
          <div className="space-y-1.5">
            <Label htmlFor="add-source">File source</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger id="add-source" className="w-full"><SelectValue placeholder="Choose a source" /></SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}><SourceTypeIcon type={s.type} /> {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This workspace has no file source yet.</p>
        )}
        <p className="text-sm">
          <Link href={`${base}/sources/new?type=file`} className="font-medium underline underline-offset-4">Create a source</Link>
          <span className="text-muted-foreground"> instead, then pick these files from the library.</span>
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!sourceId}
            onClick={() => {
              addFilesToSource(files.map((f) => f.id), sourceId)
              toast.success(`Added ${label}`, { description: `${sources.find((s) => s.id === sourceId)?.name} is processing the new items.` })
              onOpenChange(false)
              setSourceId("")
            }}
          >
            Add to source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReplaceDialog({ file, open, onOpenChange }: { file?: FileRecord; open: boolean; onOpenChange: (o: boolean) => void }) {
  const addFileVersion = useMock((s) => s.addFileVersion)
  const inputRef = useRef<HTMLInputElement>(null)
  const n = file?.usedBySourceIds.length ?? 0
  const replace = (size: number) => {
    if (!file) return
    addFileVersion(file.id, size)
    toast.success(`Uploaded v${file.version + 1}`, { description: n ? `${n} source${n === 1 ? "" : "s"} reprocessing ${file.name}` : file.name })
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace {file?.name}</DialogTitle>
          <DialogDescription>
            The upload becomes v{(file?.version ?? 0) + 1}; earlier versions stay in the version history.{" "}
            {n ? `Sources using the file reprocess it (${n} source${n === 1 ? "" : "s"}).` : "No source uses this file yet."}
          </DialogDescription>
        </DialogHeader>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f.size); e.target.value = "" }} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()}><Upload className="size-4" /> Choose file</Button>
          <Button variant="outline" onClick={() => replace(Math.round((file?.sizeBytes ?? 1_000_000) * (0.9 + Math.random() * 0.3)))}>Use a sample new version</Button>
        </div>
        {file && <p className="text-xs text-muted-foreground">Current: v{file.version} · {bytes(file.sizeBytes)}</p>}
      </DialogContent>
    </Dialog>
  )
}

/** Delete with dependents: sources using the files and the KBs reached through them. */
export function FileDeleteDialog({ files, open, onOpenChange, onDeleted }: { files: FileRecord[]; open: boolean; onOpenChange: (o: boolean) => void; onDeleted?: () => void }) {
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const deleteFiles = useMock((s) => s.deleteFiles)
  if (!files.length) return null
  const usage = files.map((f) => fileUsage(f, sources, kbs))
  const srcNames = Array.from(new Set(usage.flatMap((u) => u.sources.map((s) => s.name))))
  const kbNames = Array.from(new Set(usage.flatMap((u) => u.kbs.map((k) => k.name))))
  const name = files.length === 1 ? files[0].name : `${files.length} files`
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${name}?`}
      objectName={name}
      description={`${bytes(files.reduce((n, f) => n + f.sizeBytes, 0))} and every version are removed from storage.`}
      dependents={[
        { kind: "source", names: srcNames },
        { kind: "knowledge base", names: kbNames },
      ]}
      consequence={srcNames.length ? `Items from ${files.length === 1 ? "this file" : "these files"} are removed from ${kbNames.length} knowledge base${kbNames.length === 1 ? "" : "s"}.` : undefined}
      onConfirm={() => {
        deleteFiles(files.map((f) => f.id))
        toast.success(`Deleted ${name}`)
        onDeleted?.()
      }}
    />
  )
}

/** New folder or rename folder; name 1 to 80 characters, unique among siblings. */
export function FolderNameDialog({ open, onOpenChange, parentId, folder }: { open: boolean; onOpenChange: (o: boolean) => void; parentId: string | null; folder?: Folder }) {
  const folders = useMock((s) => s.folders)
  const addFolder = useMock((s) => s.addFolder)
  const renameFolder = useMock((s) => s.renameFolder)
  const [name, setName] = useState(folder?.name ?? "")
  const [touched, setTouched] = useState(false)
  const [key, setKey] = useState(`${open}${folder?.id}`)
  if (`${open}${folder?.id}` !== key) {
    setKey(`${open}${folder?.id}`)
    setName(folder?.name ?? "")
    setTouched(false)
  }
  const parent = folder ? folder.parentId : parentId
  const clash = folders.some((f) => f.parentId === parent && f.id !== folder?.id && f.name.toLowerCase() === name.trim().toLowerCase())
  const error = !name.trim() ? "Enter a folder name." : name.trim().length > 80 ? "Use 80 characters or fewer." : clash ? "A folder with this name already exists here." : undefined
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (error) return
            if (folder) {
              renameFolder(folder.id, name.trim())
              toast.success("Folder renamed", { description: name.trim() })
            } else {
              addFolder(name.trim(), parentId)
              toast.success("Folder created", { description: `${folderLabel(parentId, folders)} / ${name.trim()}` })
            }
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{folder ? "Rename folder" : "New folder"}</DialogTitle>
            <DialogDescription>{folder ? `In ${folderLabel(folder.parentId, folders)}.` : `Created in ${folderLabel(parentId, folders)}.`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Name</Label>
            <Input id="folder-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus aria-invalid={touched && !!error} />
            <div className="flex justify-between text-xs">
              <span className="text-destructive">{touched && error}</span>
              <span className="tabular-nums text-muted-foreground">{name.trim().length}/80</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{folder ? "Rename" : "Create folder"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
