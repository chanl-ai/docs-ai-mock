"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Database, MoreHorizontal, Plus, Play, RefreshCw, Copy, Trash2, Users, KeyRound, Server, Globe, LayoutGrid, Rows3 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { KbHealthBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { DeleteDialog } from "@/components/shared/dialogs"
import { CreateKbSheet } from "@/components/knowledge/create-kb-sheet"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, relative } from "@/lib/format"
import type { KnowledgeBase } from "@/lib/mock/types"
import { KbDot } from "@/components/knowledge/kb-dot"

export function KbList({ initialCreateOpen = false }: { initialCreateOpen?: boolean }) {
  const state = usePageState()
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const kbs = useMock((s) => s.kbs)
  const sources = useMock((s) => s.sources)
  const tokens = useMock((s) => s.mcpTokens)
  const apiKeys = useMock((s) => s.apiKeys)
  const refreshKb = useMock((s) => s.refreshKb)
  const duplicateKb = useMock((s) => s.duplicateKb)
  const deleteKb = useMock((s) => s.deleteKb)
  const [createOpen, setCreateOpen] = useState(initialCreateOpen)
  const [deleting, setDeleting] = useState<KnowledgeBase | null>(null)
  const [view, setView] = useState<"table" | "grid">("table")

  const data = state === "empty" ? [] : kbs
  const srcName = (id: string) => sources.find((s) => s.id === id)?.name ?? id

  const columns = useMemo<ColumnDef<KnowledgeBase>[]>(() => {
    const cols: ColumnDef<KnowledgeBase>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <KbDot color={row.original.color} />
            <div className="min-w-0">
              <Link href={`${base}/kb/${row.original.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                {row.original.name}
              </Link>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{row.original.slug}</div>
            </div>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.name} ${row.original.description}`.toLowerCase().includes(value.toLowerCase()),
      },
      {
        accessorKey: "health",
        header: "Health",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <KbHealthBadge health={row.original.health} />
            {row.original.indexing && (
              <div className="flex items-center gap-2">
                <Progress value={(row.original.indexing.done / row.original.indexing.total) * 100} className="h-1 w-20" />
                <span className="text-[11px] tabular-nums text-muted-foreground">{row.original.indexing.done} of {row.original.indexing.total}</span>
              </div>
            )}
          </div>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "sources",
        accessorFn: (r) => r.sources.length,
        header: ({ column }) => <SortHeader column={column} title="Sources" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default tabular-nums underline decoration-dotted underline-offset-4">{row.original.sources.length}</span>
            </TooltipTrigger>
            <TooltipContent>
              <ul className="text-xs">{row.original.sources.map((l) => <li key={l.sourceId}>{srcName(l.sourceId)}</li>)}</ul>
            </TooltipContent>
          </Tooltip>
        ),
      },
      { id: "documents", accessorFn: (r) => r.stats.documents, header: ({ column }) => <SortHeader column={column} title="Documents" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.stats.documents) },
      { id: "chunks", accessorFn: (r) => r.stats.chunks, header: ({ column }) => <SortHeader column={column} title="Chunks" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.stats.chunks) },
      { id: "refreshed", accessorFn: (r) => r.lastRefreshedAt ?? "", header: ({ column }) => <SortHeader column={column} title="Last refreshed" />, cell: ({ row }) => <span className="text-muted-foreground">{relative(row.original.lastRefreshedAt)}</span> },
      { id: "queries", accessorFn: (r) => r.stats.queries7d, header: ({ column }) => <SortHeader column={column} title="Queries · 7d" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.stats.queries7d) },
      {
        id: "access",
        accessorFn: (r) => [r.access.members.mode === "all" ? "members" : "selected", r.access.anyApiKey || apiKeys.some((k) => k.kbIds.includes(r.id)) ? "api" : "", r.access.mcp.enabled ? "mcp" : "", r.access.publicLink.enabled ? "public" : ""].filter(Boolean),
        header: "Access",
        cell: ({ row }) => {
          const a = row.original.access
          const hasApi = a.anyApiKey || apiKeys.some((k) => k.kbIds.includes(row.original.id))
          const icons = [
            { on: true, icon: Users, label: a.members.mode === "all" ? "All members" : `${a.members.principals.length} members or groups` },
            { on: hasApi, icon: KeyRound, label: "API keys" },
            { on: a.mcp.enabled, icon: Server, label: `MCP tool ${a.mcp.toolName}` },
            { on: a.publicLink.enabled, icon: Globe, label: `Public link /share/kb/${a.publicLink.slug}` },
          ]
          return (
            <div className="flex items-center gap-1.5">
              {icons.filter((i) => i.on).map((i) => (
                <Tooltip key={i.label}>
                  <TooltipTrigger asChild>
                    <i.icon className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{i.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )
        },
        filterFn: (row, id, value: string[]) => (row.getValue(id) as string[]).some((v) => value.includes(v)),
      },
    ]
    if (admin) {
      cols.push({
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`${base}/kb/${row.original.id}`)}>Open</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`${base}/kb/${row.original.id}/playground`)}><Play className="size-4" /> Open playground</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { refreshKb(row.original.id); toast.success("Index refresh started", { description: row.original.name }) }}><RefreshCw className="size-4" /> Refresh index</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { const c = duplicateKb(row.original.id); toast.success("Duplicated", { description: `${c.name} copies settings and source links, not chunks.` }) }}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row.original)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      })
      cols.unshift(selectColumn<KnowledgeBase>())
    }
    return cols
  }, [admin, base, router, refreshKb, duplicateKb, apiKeys, sources]) // eslint-disable-line react-hooks/exhaustive-deps

  const deps = deleting
    ? [
        { kind: "API key", names: apiKeys.filter((k) => k.kbIds.includes(deleting.id)).map((k) => k.name) },
        { kind: "MCP token", names: tokens.filter((t) => t.status === "active" && (t.kbIds.length === 0 || t.kbIds.includes(deleting.id))).map((t) => t.name) },
        { kind: "share link", names: deleting.access.publicLink.enabled ? [`/share/kb/${deleting.access.publicLink.slug}`] : [] },
      ]
    : []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Knowledge bases"
        description="A knowledge base is a searchable index built from one or more sources, with its own retrieval settings and access rules."
        actions={
          <>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as typeof view)} variant="outline" size="sm" className="hidden md:flex">
              <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0"><Rows3 className="size-4" /></ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Card view" className="h-8 w-8 p-0"><LayoutGrid className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
            {admin && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> New knowledge base
              </Button>
            )}
          </>
        }
      />
      <PageStateGate state={state}>
        {view === "grid" && data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((k) => (
              <li key={k.id} className="relative rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <KbDot color={k.color} />
                    <Link href={`${base}/kb/${k.id}`} className="truncate after:absolute after:inset-0">{k.name}</Link>
                  </h3>
                  <KbHealthBadge health={k.health} />
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{k.description}</p>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-muted-foreground">Documents</dt><dd className="tabular-nums">{num(k.stats.documents)}</dd></div>
                  <div><dt className="text-muted-foreground">Queries 7d</dt><dd className="tabular-nums">{num(k.stats.queries7d)}</dd></div>
                  <div><dt className="text-muted-foreground">Refreshed</dt><dd>{relative(k.lastRefreshedAt)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            getRowId={(r) => r.id}
            searchColumn="name"
            searchPlaceholder="Search knowledge bases…"
            onRowClick={(r) => router.push(`${base}/kb/${r.id}`)}
            filters={[
              { column: "health", title: "Health", options: [{ label: "Healthy", value: "healthy" }, { label: "Indexing", value: "indexing" }, { label: "Degraded", value: "degraded" }, { label: "Failed", value: "failed" }, { label: "Never indexed", value: "never" }] },
              { column: "access", title: "Access", options: [{ label: "All members", value: "members" }, { label: "API keys", value: "api" }, { label: "MCP", value: "mcp" }, { label: "Public link", value: "public" }] },
            ]}
            bulkActions={
              admin
                ? [
                    { label: "Refresh", icon: RefreshCw, onClick: (rows) => { rows.forEach((r) => refreshKb(r.id)); toast.success(`Refreshing ${rows.length} knowledge base${rows.length === 1 ? "" : "s"}`) } },
                    { label: "Delete", icon: Trash2, variant: "destructive", onClick: (rows) => { rows.forEach((r) => deleteKb(r.id)); toast.success(`Deleted ${rows.length}`) } },
                  ]
                : []
            }
            emptyState={
              <div className="rounded-lg border">
                <EmptyState
                  icon={Database}
                  title="No knowledge bases yet"
                  description={admin ? "A knowledge base is a searchable index built from one or more sources. Create one and pick the sources it reads, or add a source first." : "A knowledge base is a searchable index built from one or more sources. None has been shared with you yet; ask an admin for access."}
                  action={admin ? { label: "New knowledge base", onClick: () => setCreateOpen(true) } : { label: "Open Team", href: `${base}/team` }}
                  secondaryAction={admin ? { label: "Add a source first", href: `${base}/sources/new` } : undefined}
                />
              </div>
            }
          />
        )}
      </PageStateGate>

      <CreateKbSheet open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o && initialCreateOpen) router.replace(`${base}/kb`) }} />
      {deleting && (
        <DeleteDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          objectName={deleting.name}
          description="The index and its retrieval settings are removed. Sources and their items are kept."
          dependents={deps}
          consequence={deps.some((d) => d.names.length) ? "These will stop working until they are pointed at another knowledge base." : undefined}
          onConfirm={() => { deleteKb(deleting.id); toast.success("Knowledge base deleted", { description: deleting.name }) }}
        />
      )}
    </div>
  )
}
