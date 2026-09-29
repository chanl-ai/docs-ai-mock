"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Copy, History, MoreHorizontal, Pencil, Save, SearchX, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { ToolStatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/states"
import { DeleteDialog } from "@/components/shared/dialogs"
import { Section } from "@/components/shared/surface"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, snakeify } from "@/lib/format"
import type { Tool } from "@/lib/mock/types"
import { ToolDraftContext } from "./tool-context"
import { editable, isDirty } from "./tool-helpers"
import { TestPanel } from "./test-panel"

export function ToolShell({ children }: { children: ReactNode }) {
  const state = usePageState()
  const { toolId } = useParams<{ toolId: string }>()
  const { base } = useWs()
  const saved = useMock((s) => s.tools.find((t) => t.id === toolId))
  const [draft, setDraftState] = useState<Tool | undefined>(saved)

  useEffect(() => {
    setDraftState(saved)
    // Reset only when the route points at another tool; stats updates must not wipe edits.
  }, [saved?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-72 max-w-full" />
        <div className="max-w-2xl space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    )
  }

  if (!saved || !draft) {
    return (
      <Section flush>
        <EmptyState
          icon={SearchX}
          title="Tool not found"
          description={<>No tool with the id <span className="font-mono text-xs">{toolId}</span> exists in this workspace. It may have been deleted.</>}
          action={{ label: "Back to tools", href: `${base}/tools` }}
        />
      </Section>
    )
  }

  return <ToolShellInner saved={saved} draft={draft} setDraftState={setDraftState}>{children}</ToolShellInner>
}

function ToolShellInner({ saved, draft, setDraftState, children }: { saved: Tool; draft: Tool; setDraftState: (t: Tool | undefined) => void; children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { base } = useWs()
  const { admin } = useRole()
  const tools = useMock((s) => s.tools)
  const updateTool = useMock((s) => s.updateTool)
  const setToolStatus = useMock((s) => s.setToolStatus)
  const duplicateTool = useMock((s) => s.duplicateTool)
  const deleteTool = useMock((s) => s.deleteTool)
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(draft.name)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const dirty = isDirty(draft, saved)
  const readOnly = !admin
  const canTest = admin || saved.availableToMembers

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  const save = () => {
    const e = editable(draft)
    updateTool(saved.id, { ...e, slug: snakeify(draft.name) || saved.slug, code: draft.code ? { ...draft.code, deployedVersion: saved.code?.deployedVersion } : undefined })
    const next = useMock.getState().tools.find((t) => t.id === saved.id)
    setDraftState(next)
    toast.success(`Saved as v${next?.version ?? saved.version + 1}`, { description: draft.name })
  }

  const setDraft = (next: Tool | ((t: Tool) => Tool)) => setDraftState(typeof next === "function" ? next(draft) : next)
  const patch = (p: Partial<Tool>) => setDraftState({ ...draft, ...p })

  const tbase = `${base}/tools/${saved.id}`
  const configTab = saved.type === "rest" ? { value: "rest", label: "REST" } : { value: "code", label: "Code" }
  const onTest = pathname.endsWith("/test")
  const current = onTest ? "test" : pathname.endsWith(`/${configTab.value}`) ? configTab.value : "general"
  const renameError = newName.trim().length < 2 || newName.trim().length > 60 ? "Name must be 2 to 60 characters" : tools.some((t) => t.id !== saved.id && t.name.toLowerCase() === newName.trim().toLowerCase()) ? "Another tool has this name" : null

  return (
    <ToolDraftContext.Provider value={{ saved, draft, setDraft, patch, dirty, save, readOnly, canTest }}>
      <div className="flex flex-col gap-5">
        <PageHeader
          title={
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">{draft.name}</span>
              {admin && (
                <Button variant="ghost" size="icon" className="size-7" aria-label="Rename tool" onClick={() => { setNewName(draft.name); setRenameOpen(true) }}>
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </span>
          }
          badge={
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">{saved.type === "rest" ? "REST" : "Code"}</Badge>
              {admin ? (
                <label className="flex items-center gap-2 text-sm">
                  {saved.status === "draft" ? <ToolStatusBadge status="draft" /> : <span className="text-muted-foreground">{saved.status === "active" ? "Active" : "Inactive"}</span>}
                  <Switch
                    checked={saved.status === "active"}
                    aria-label={saved.status === "active" ? "Deactivate tool" : "Activate tool"}
                    onCheckedChange={(v) => { setToolStatus(saved.id, v ? "active" : "inactive"); toast.success(v ? "Tool activated" : "Tool deactivated", { description: saved.name }) }}
                  />
                </label>
              ) : (
                <ToolStatusBadge status={saved.status} />
              )}
              <span className="font-mono text-xs text-muted-foreground">v{saved.version}</span>
              {dirty && <Badge variant="secondary" className="font-normal">Unsaved changes</Badge>}
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Module</span>
              <span aria-hidden>·</span>
              <span>Owner <span className="text-foreground">{saved.owner}</span></span>
              <span aria-hidden>·</span>
              <span>{saved.consumers.length} consumer{saved.consumers.length === 1 ? "" : "s"}</span>
              <span aria-hidden>·</span>
              <Link href={`${base}/executions?tool=${saved.id}`} className="underline-offset-4 hover:underline">{num(saved.stats7d.executions)} calls in 7 d</Link>
            </span>
          }
          scope={<span className="font-mono">{saved.slug}</span>}
          actions={
            admin && (
              <>
                <Button size="sm" disabled={!dirty} onClick={save}><Save className="size-4" /> Save</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline" className="size-8" aria-label="More actions"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`${base}/executions?tool=${saved.id}`)}><History className="size-4" /> View executions</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { const c = duplicateTool(saved.id); toast.success("Duplicated as a draft", { description: c.name }); router.push(`${base}/tools/${c.id}/general`) }}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          }
          tabs={
            <Tabs value={current} className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="general" asChild><Link href={`${tbase}/general`}>General</Link></TabsTrigger>
                <TabsTrigger value={configTab.value} asChild><Link href={`${tbase}/${configTab.value}`}>{configTab.label}</Link></TabsTrigger>
                <TabsTrigger value="test" asChild className="lg:hidden"><Link href={`${tbase}/test`}>Test</Link></TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {onTest ? (
          children
        ) : (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
            <div className="min-w-0">{children}</div>
            <aside className="hidden min-w-0 lg:block">
              <div className="sticky top-4"><TestPanel compact /></div>
            </aside>
          </div>
        )}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename tool</DialogTitle>
            <DialogDescription>The MCP tool name follows the display name. Save to apply it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rename-tool">Name</Label>
            <Input id="rename-tool" value={newName} onChange={(e) => setNewName(e.target.value)} aria-invalid={!!renameError} />
            {renameError ? <p className="text-xs text-destructive">{renameError}</p> : <p className="text-xs text-muted-foreground">MCP tool name: <span className="font-mono">{snakeify(newName)}</span></p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button disabled={!!renameError} onClick={() => { patch({ name: newName.trim() }); setRenameOpen(false) }}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${saved.name}?`}
        objectName={saved.name}
        description="The tool is removed from every assistant, MCP token and API consumer that can call it."
        dependents={[{ kind: "consumer", names: saved.consumers.map((c) => c.name) }]}
        consequence={`${num(saved.stats7d.executions)} execution${saved.stats7d.executions === 1 ? "" : "s"} in the last 7 days are deleted with it.`}
        onConfirm={() => { deleteTool(saved.id); toast.success("Tool deleted", { description: saved.name }); router.push(`${base}/tools`) }}
      />
    </ToolDraftContext.Provider>
  )
}
