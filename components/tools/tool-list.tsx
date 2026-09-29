"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { ChevronDown, Copy, FileCode2, MoreHorizontal, Play, Plus, Power, Rocket, Terminal, Trash2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { ToolStatusBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { DeleteDialog } from "@/components/shared/dialogs"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, pct, relative } from "@/lib/format"
import type { Tool } from "@/lib/mock/types"
import { CreateToolDialog } from "./create-tool-dialog"
import { ImportToolsDialog } from "./import-tools-dialog"
import { scopeLabel } from "./tool-helpers"

export function ToolList({ dialog, importFrom = "openapi" }: { dialog?: "create" | "import"; importFrom?: "openapi" | "curl" }) {
  const state = usePageState()
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const tools = useMock((s) => s.tools)
  const integrations = useMock((s) => s.integrations)
  const setToolStatus = useMock((s) => s.setToolStatus)
  const duplicateTool = useMock((s) => s.duplicateTool)
  const deployTool = useMock((s) => s.deployTool)
  const deleteTool = useMock((s) => s.deleteTool)
  const [createOpen, setCreateOpen] = useState(dialog === "create")
  const [deleting, setDeleting] = useState<Tool | null>(null)

  const data = state === "empty" ? [] : tools
  const intName = (type?: string) => integrations.find((i) => i.type === type)?.name ?? type ?? ""

  const columns = useMemo<ColumnDef<Tool>[]>(() => {
    const cols: ColumnDef<Tool>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[260px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`${base}/tools/${row.original.id}/general`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                  {row.original.name}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{row.original.description || "No description"}</TooltipContent>
            </Tooltip>
            <div className="truncate font-mono text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.name} ${row.original.slug} ${row.original.description}`.toLowerCase().includes(value.toLowerCase()),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <Badge variant="outline" className="font-normal">{row.original.type === "rest" ? "REST" : "Code"}</Badge>,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ToolStatusBadge status={row.original.status} />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      { accessorKey: "version", header: ({ column }) => <SortHeader column={column} title="Version" />, cell: ({ row }) => <span className="font-mono text-xs">v{row.original.version}</span> },
      { accessorKey: "owner", header: ({ column }) => <SortHeader column={column} title="Owner" />, cell: ({ row }) => <span className="whitespace-nowrap">{row.original.owner}</span> },
      {
        id: "integration",
        accessorFn: (r) => r.integrationType ?? "none",
        header: "Integration",
        cell: ({ row }) => (row.original.integrationType ? <Badge variant="secondary" className="font-normal">{intName(row.original.integrationType)}</Badge> : <span className="text-muted-foreground/60">—</span>),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "consumers",
        accessorFn: (r) => r.consumers.length,
        header: ({ column }) => <SortHeader column={column} title="Consumers" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) =>
          row.original.consumers.length ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default tabular-nums underline decoration-dotted underline-offset-4">{row.original.consumers.length}</span>
              </TooltipTrigger>
              <TooltipContent>
                <ul className="text-xs">
                  {row.original.consumers.map((c) => (
                    <li key={c.name}>{c.name} · {scopeLabel[c.scope]}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground">0</span>
          ),
      },
      {
        id: "executions",
        accessorFn: (r) => r.stats7d.executions,
        header: ({ column }) => <SortHeader column={column} title="Executions · 7d" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="tabular-nums">{num(row.original.stats7d.executions)}</span>
            {row.original.stats7d.executions > 0 && <span className="text-xs tabular-nums text-muted-foreground">{pct(row.original.stats7d.successRate, 1)} success</span>}
          </div>
        ),
      },
      { accessorKey: "updatedAt", header: ({ column }) => <SortHeader column={column} title="Updated" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.updatedAt)}</span> },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const t = row.original
          const canTest = admin || t.availableToMembers
          return (
            <div onClick={(e) => e.stopPropagation()} className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`${base}/tools/${t.id}/general`)}>Open</DropdownMenuItem>
                  {canTest && <DropdownMenuItem onClick={() => router.push(`${base}/tools/${t.id}/test`)}><Play className="size-4" /> Test</DropdownMenuItem>}
                  {admin && (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          const next = t.status === "active" ? "inactive" : "active"
                          setToolStatus(t.id, next)
                          toast.success(next === "active" ? "Tool activated" : "Tool deactivated", { description: t.name })
                        }}
                      >
                        <Power className="size-4" /> {t.status === "active" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const c = duplicateTool(t.id); toast.success("Duplicated as a draft", { description: c.name }) }}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
                      {t.type === "code" && (
                        <DropdownMenuItem onClick={() => { deployTool(t.id); toast.success(`Deployed v${t.version}`, { description: t.name }) }}><Rocket className="size-4" /> Deploy</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(t)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
    if (admin) cols.unshift(selectColumn<Tool>())
    return cols
  }, [admin, base, router, setToolStatus, duplicateTool, deployTool, integrations]) // eslint-disable-line react-hooks/exhaustive-deps

  const intOptions = [
    { label: "None", value: "none" },
    ...Array.from(new Set(tools.map((t) => t.integrationType).filter(Boolean) as string[])).map((v) => ({ label: intName(v), value: v })),
  ]

  const closeDialog = () => router.replace(`${base}/tools`)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tools"
        description="Tools are modules an assistant can call to act on your systems. Each has an owner, a scope per consumer, and a call log."
        actions={
          admin && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">Import <ChevronDown className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`${base}/tools/import?from=openapi`)}><FileCode2 className="size-4" /> OpenAPI</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`${base}/tools/import?from=curl`)}><Terminal className="size-4" /> cURL</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New tool</Button>
            </>
          )
        }
      />
      <PageStateGate state={state}>
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => r.id}
          searchColumn="name"
          searchPlaceholder="Search tools…"
          onRowClick={(r) => router.push(`${base}/tools/${r.id}/general`)}
          filters={[
            { column: "type", title: "Type", options: [{ label: "REST", value: "rest" }, { label: "Code", value: "code" }] },
            { column: "status", title: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Draft", value: "draft" }] },
            { column: "integration", title: "Integration", options: intOptions },
          ]}
          bulkActions={
            admin
              ? [
                  { label: "Activate", icon: Power, onClick: (rows) => { rows.forEach((r) => setToolStatus(r.id, "active")); toast.success(`Activated ${rows.length} tool${rows.length === 1 ? "" : "s"}`) } },
                  { label: "Deactivate", icon: Power, onClick: (rows) => { rows.forEach((r) => setToolStatus(r.id, "inactive")); toast.success(`Deactivated ${rows.length} tool${rows.length === 1 ? "" : "s"}`) } },
                  { label: "Delete", icon: Trash2, variant: "destructive", onClick: (rows) => { rows.forEach((r) => deleteTool(r.id)); toast.success(`Deleted ${rows.length} tool${rows.length === 1 ? "" : "s"}`) } },
                ]
              : []
          }
          emptyState={
            <div className="rounded-lg border">
              <EmptyState
                icon={Wrench}
                title="No tools yet"
                description={admin ? "Tools let assistants act on your systems: look up an account, open a case, run a calculation. Create one by hand or import it from an OpenAPI document." : "Tools let assistants act on your systems. None has been added to this workspace yet; an admin can create one."}
                action={admin ? { label: "New tool", onClick: () => setCreateOpen(true) } : undefined}
                secondaryAction={admin ? { label: "Import", href: `${base}/tools/import?from=openapi` } : undefined}
              />
            </div>
          }
        />
      </PageStateGate>

      <CreateToolDialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o && dialog === "create") closeDialog() }} />
      {dialog === "import" && <ImportToolsDialog from={importFrom} onClose={closeDialog} />}
      {deleting && (
        <DeleteDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          objectName={deleting.name}
          description="The tool is removed from every assistant, MCP token and API consumer that can call it."
          dependents={[{ kind: "consumer", names: deleting.consumers.map((c) => c.name) }]}
          consequence={`${num(deleting.stats7d.executions)} execution${deleting.stats7d.executions === 1 ? "" : "s"} in the last 7 days are deleted with it.`}
          onConfirm={() => { deleteTool(deleting.id); toast.success("Tool deleted", { description: deleting.name }) }}
        />
      )}
    </div>
  )
}
