"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus, BookOpenText } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { slugify } from "@/lib/format"

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { workspace } = useWs()
  const workspaces = useMock((s) => s.workspaces)
  const createWorkspace = useMock((s) => s.createWorkspace)
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpenText className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{workspace.name}</span>
              <span className="truncate text-xs text-muted-foreground">Docs AI · {workspace.plan}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onClick={() => router.push(`/w/${w.slug}`)} className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-sm border text-xs font-medium">{w.name[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate">{w.name}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">/{w.slug}</div>
              </div>
              {w.slug === workspace.slug && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 p-2" onClick={() => setOpen(true)}>
            <div className="flex size-6 items-center justify-center rounded-md border bg-background">
              <Plus className="size-4" />
            </div>
            <div className="font-medium text-muted-foreground">Create workspace</div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>A workspace holds its own sources, knowledge bases, tools and members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Name</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Bank" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <div className="flex items-center rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">docs-ai.example/w/</span>
                <span className="font-mono">{slugify(name) || "acme-bank"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={name.trim().length < 2} onClick={() => { const ws = createWorkspace(name.trim(), slugify(name)); setOpen(false); setName(""); router.push(`/w/${ws.slug}`) }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
