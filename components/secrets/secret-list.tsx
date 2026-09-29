"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Clock, KeyRound, MoreHorizontal, Plus, Power, RefreshCw, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { DeleteDialog } from "@/components/shared/dialogs"
import { AdminOnly } from "@/components/shared/role-gate"
import { CopyButton } from "@/components/shared/copy"
import { StatusBadge } from "@/components/shared/status-badge"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { daysUntil, relative, shortDate } from "@/lib/format"
import type { Secret } from "@/lib/mock/types"
import { BlockedDeleteDialog, RotateDialog, SecretDialog, secretTypeLabel } from "./secret-dialogs"

function ExpiryBadge({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-muted-foreground">Never</span>
  const d = daysUntil(iso) ?? 0
  if (new Date(iso).getTime() < Date.now()) return <StatusBadge tone="bad" icon={XCircle} label={`Expired ${shortDate(iso)}`} />
  if (d <= 7) return <StatusBadge tone="warn" icon={AlertTriangle} label={d <= 0 ? "Expires today" : `Expires in ${d} d`} />
  return <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground"><Clock className="size-3" /> {shortDate(iso)}</span>
}

export function SecretList() {
  return (
    <AdminOnly>
      <SecretListInner />
    </AdminOnly>
  )
}

function SecretListInner() {
  const state = usePageState()
  const secrets = useMock((s) => s.secrets)
  const tools = useMock((s) => s.tools)
  const sources = useMock((s) => s.sources)
  const updateSecret = useMock((s) => s.updateSecret)
  const deleteSecret = useMock((s) => s.deleteSecret)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Secret | undefined>()
  const [rotating, setRotating] = useState<Secret | undefined>()
  const [deleting, setDeleting] = useState<Secret | undefined>()
  const [blocked, setBlocked] = useState<Secret | undefined>()

  const data = state === "empty" ? [] : secrets
  const referenced = (s: Secret) => s.usedByToolIds.length + s.usedBySourceIds.length > 0
  const usedNames = (s: Secret) => [
    ...tools.filter((t) => s.usedByToolIds.includes(t.id)).map((t) => `Tool · ${t.name}`),
    ...sources.filter((x) => s.usedBySourceIds.includes(x.id)).map((x) => `Source · ${x.name}`),
  ]

  const setActive = (s: Secret, on: boolean) => {
    updateSecret(s.id, { isActive: on })
    toast.success(on ? "Secret activated" : "Secret deactivated", { description: on ? s.name : `${s.name} · calls using it now fail` })
  }
  const askDelete = (s: Secret) => (referenced(s) ? setBlocked(s) : setDeleting(s))

  const columns = useMemo<ColumnDef<Secret>[]>(
    () => [
      selectColumn<Secret>(),
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-mono text-xs font-medium">{row.original.name}</div>
            <div className="flex items-center gap-1 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
              <span className="font-mono text-xs">{`{{secret.${row.original.name}}}`}</span>
              <CopyButton text={`{{secret.${row.original.name}}}`} iconOnly variant="ghost" label="Copy reference" className="size-6" />
            </div>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.name} ${row.original.description} ${row.original.tags.join(" ")}`.toLowerCase().includes(value.toLowerCase()),
      },
      { accessorKey: "type", header: "Type", cell: ({ row }) => <Badge variant="outline" className="font-normal">{secretTypeLabel[row.original.type]}</Badge>, filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)) },
      {
        id: "active",
        accessorFn: (r) => (r.isActive ? "active" : "inactive"),
        header: "Active",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
            <Switch checked={row.original.isActive} onCheckedChange={(v) => setActive(row.original, v)} aria-label={`${row.original.isActive ? "Deactivate" : "Activate"} ${row.original.name}`} />
            <span className="text-xs text-muted-foreground">{row.original.isActive ? "On" : "Off"}</span>
          </div>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      { id: "expires", accessorFn: (r) => r.expiresAt ?? "9999", header: ({ column }) => <SortHeader column={column} title="Expires" />, cell: ({ row }) => <ExpiryBadge iso={row.original.expiresAt} /> },
      { id: "lastUsed", accessorFn: (r) => r.lastUsedAt ?? "", header: ({ column }) => <SortHeader column={column} title="Last used" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.lastUsedAt)}</span> },
      {
        id: "usedBy",
        accessorFn: (r) => r.usedByToolIds.length + r.usedBySourceIds.length,
        header: ({ column }) => <SortHeader column={column} title="Used by" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) => {
          const names = usedNames(row.original)
          if (!names.length) return <span className="text-muted-foreground">0</span>
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default whitespace-nowrap tabular-nums underline decoration-dotted underline-offset-4">
                  {row.original.usedByToolIds.length} tool{row.original.usedByToolIds.length === 1 ? "" : "s"} · {row.original.usedBySourceIds.length} source{row.original.usedBySourceIds.length === 1 ? "" : "s"}
                </span>
              </TooltipTrigger>
              <TooltipContent><ul className="text-xs">{names.map((n) => <li key={n}>{n}</li>)}</ul></TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        id: "tags",
        accessorFn: (r) => r.tags.join(" "),
        header: "Tags",
        cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.tags.map((t) => <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>)}</div>,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const s = row.original
          return (
            <div onClick={(e) => e.stopPropagation()} className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditing(s); setDialogOpen(true) }}>Edit metadata</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRotating(s)}><RefreshCw className="size-4" /> Rotate value</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActive(s, !s.isActive)}><Power className="size-4" /> {s.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => askDelete(s)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [tools, sources], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Secrets"
        description="API keys and credentials, stored encrypted and referenced by name from tools and sources. Values are never shown after they are saved."
        scope="Applies to the whole workspace."
        actions={<Button size="sm" onClick={() => { setEditing(undefined); setDialogOpen(true) }}><Plus className="size-4" /> New secret</Button>}
      />
      <PageStateGate state={state}>
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => r.id}
          searchColumn="name"
          searchPlaceholder="Search secrets…"
          onRowClick={(r) => { setEditing(r); setDialogOpen(true) }}
          filters={[
            { column: "type", title: "Type", options: (Object.keys(secretTypeLabel) as Secret["type"][]).map((t) => ({ label: secretTypeLabel[t], value: t })) },
            { column: "active", title: "Active", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
          ]}
          bulkActions={[
            { label: "Deactivate", icon: Power, onClick: (rows) => { rows.forEach((r) => updateSecret(r.id, { isActive: false })); toast.success(`Deactivated ${rows.length} secret${rows.length === 1 ? "" : "s"}`) } },
            {
              label: "Delete",
              icon: Trash2,
              variant: "destructive",
              onClick: (rows) => {
                const done = rows.filter((r) => deleteSecret(r.id))
                const kept = rows.filter((r) => !done.includes(r))
                if (done.length) toast.success(`Deleted ${done.length} secret${done.length === 1 ? "" : "s"}`)
                if (kept.length) toast.error(`${kept.length} not deleted because tools or sources reference ${kept.length === 1 ? "it" : "them"}`, { description: kept.map((k) => k.name).join(", ") })
              },
            },
          ]}
          emptyState={
            <div className="rounded-lg border">
              <EmptyState
                icon={KeyRound}
                title="No secrets yet"
                description="A secret stores an API key, token or password once, encrypted. Tools and sources reference it as {{secret.NAME}} so the value never appears in a request template or a log."
                action={{ label: "New secret", onClick: () => { setEditing(undefined); setDialogOpen(true) } }}
              />
            </div>
          }
        />
      </PageStateGate>

      <SecretDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      <RotateDialog secret={rotating} onOpenChange={(o) => !o && setRotating(undefined)} />
      <BlockedDeleteDialog secret={blocked} onOpenChange={(o) => !o && setBlocked(undefined)} />
      {deleting && (
        <DeleteDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(undefined)}
          title={`Delete ${deleting.name}?`}
          objectName={deleting.name}
          description="Nothing references this secret. The encrypted value is destroyed and cannot be recovered."
          onConfirm={() => { if (deleteSecret(deleting.id)) toast.success("Secret deleted", { description: deleting.name }) }}
        />
      )}
    </div>
  )
}
