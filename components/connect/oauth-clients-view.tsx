"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, MoreHorizontal, Pencil, PauseCircle, Plus, RotateCcw, ShieldCheck, Trash2, UserX } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { Section } from "@/components/shared/surface"
import { CopyButton, CopyableField } from "@/components/shared/copy"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, SortHeader } from "@/components/shared/data-table"
import { EmptyState, PageStateGate, TableSkeleton } from "@/components/shared/states"
import { ConfirmDialog, DeleteDialog } from "@/components/shared/dialogs"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, shortDate } from "@/lib/format"
import type { OAuthClient } from "@/lib/mock/types"
import { mcpBase } from "./connect-helpers"
import { OAuthClientDialog, SecretOnceDialog } from "./oauth-client-dialog"

const CONSENT_HREF = "/oauth/authorize?client_id=dai_client_5kq2m8x1&scope=knowledge:read+tools:run&redirect_uri=https://claude.ai/api/mcp/auth_callback"

export function OAuthClientsView() {
  const state = usePageState()
  const { slug } = useWs()
  const clients = useMock((s) => s.oauthClients)
  const updateOAuthClient = useMock((s) => s.updateOAuthClient)
  const deleteOAuthClient = useMock((s) => s.deleteOAuthClient)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OAuthClient | null>(null)
  const [secretShow, setSecretShow] = useState<{ title: string; clientId: string; secret?: string } | null>(null)
  const [rotating, setRotating] = useState<OAuthClient | null>(null)
  const [revokingGrants, setRevokingGrants] = useState<OAuthClient | null>(null)
  const [deleting, setDeleting] = useState<OAuthClient | null>(null)

  const data = state === "empty" ? [] : clients

  const columns = useMemo<ColumnDef<OAuthClient>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Client name" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.clientType === "public" ? "Public (PKCE)" : "Confidential"}</div>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.name} ${row.original.clientId}`.toLowerCase().includes(value.toLowerCase()),
      },
      {
        accessorKey: "clientId",
        header: "Client id",
        cell: ({ row }) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="font-mono text-xs">{row.original.clientId}</span>
            <CopyButton text={row.original.clientId} iconOnly variant="ghost" label={`Copy ${row.original.clientId}`} />
          </div>
        ),
      },
      {
        id: "uris",
        accessorFn: (r) => r.redirectUris.length,
        header: ({ column }) => <SortHeader column={column} title="Redirect URIs" align="right" />,
        meta: { align: "right" },
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default tabular-nums underline decoration-dotted underline-offset-4">{row.original.redirectUris.length}</span>
            </TooltipTrigger>
            <TooltipContent><ul className="font-mono text-xs">{row.original.redirectUris.map((u) => <li key={u}>{u}</li>)}</ul></TooltipContent>
          </Tooltip>
        ),
      },
      { id: "scopes", header: "Allowed scopes", cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.allowedScopes.map((s) => <Badge key={s} variant="secondary" className="font-mono text-[11px]">{s}</Badge>)}</div> },
      { accessorKey: "usersAuthorised", header: ({ column }) => <SortHeader column={column} title="Users authorised" align="right" />, meta: { align: "right" }, cell: ({ row }) => num(row.original.usersAuthorised) },
      { accessorKey: "createdAt", header: ({ column }) => <SortHeader column={column} title="Created" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{shortDate(row.original.createdAt)}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => (row.original.status === "active" ? <StatusBadge tone="good" icon={CheckCircle2} label="Active" /> : <StatusBadge tone="neutral" icon={PauseCircle} label="Disabled" />) },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${row.original.name}`}><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(row.original)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                {row.original.clientType === "confidential" && <DropdownMenuItem onClick={() => setRotating(row.original)}><RotateCcw className="size-4" /> Rotate secret</DropdownMenuItem>}
                <DropdownMenuItem disabled={row.original.usersAuthorised === 0} onClick={() => setRevokingGrants(row.original)}><UserX className="size-4" /> Revoke all user grants</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row.original)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <AdminOnly>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="OAuth clients"
          description="Register AI applications that sign users in with OAuth instead of a shared token. Each user approves access once and acts with their own permissions."
          scope="Applies to this workspace's MCP server."
          actions={
            <>
              <Button variant="outline" size="sm" asChild><Link href={CONSENT_HREF}>Try the consent screen</Link></Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Register client</Button>
            </>
          }
        />
        {state === "loading" ? (
          <div className="space-y-5"><Skeleton className="h-36 rounded-lg" /><TableSkeleton rows={4} cols={6} /></div>
        ) : (
          <>
            <Section title="Discovery" description="Clients that support OAuth discovery find the authorisation server from these URLs.">
              <div className="grid gap-3 md:grid-cols-2">
                <CopyableField label="Authorisation server metadata" value={`${mcpBase(slug)}/.well-known/oauth-authorization-server`} />
                <CopyableField label="Protected resource metadata" value={`${mcpBase(slug)}/.well-known/oauth-protected-resource`} />
              </div>
            </Section>
            <PageStateGate state={state}>
              <DataTable
                columns={columns}
                data={data}
                getRowId={(r) => r.id}
                searchColumn="name"
                searchPlaceholder="Search clients…"
                onRowClick={(r) => setEditing(r)}
                emptyState={
                  <div className="rounded-lg border">
                    <EmptyState
                      icon={ShieldCheck}
                      title="No OAuth clients yet"
                      description="An OAuth client is an AI application registered to sign people in to this workspace. Each person approves it once on a consent screen, and it then acts with their own access instead of a shared token. Register one per application, with the redirect URIs it will call back to."
                      action={{ label: "Register client", onClick: () => setCreateOpen(true) }}
                    />
                  </div>
                }
              />
            </PageStateGate>
          </>
        )}

        {createOpen && <OAuthClientDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(c, secret) => setSecretShow({ title: `${c.name} registered`, clientId: c.clientId, secret })} />}
        {editing && <OAuthClientDialog key={editing.id} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} editing={editing} />}
        {secretShow && <SecretOnceDialog open={!!secretShow} onOpenChange={(o) => !o && setSecretShow(null)} {...secretShow} />}
        {rotating && (
          <ConfirmDialog
            open={!!rotating}
            onOpenChange={(o) => !o && setRotating(null)}
            title={`Rotate the secret for ${rotating.name}?`}
            description="The current secret stops working immediately. Update the application with the new secret right after."
            confirmLabel="Rotate secret"
            destructive
            onConfirm={() => {
              const secret = `dai_cs_${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}`
              toast.success("Secret rotated", { description: rotating.name })
              setSecretShow({ title: "New client secret", clientId: rotating.clientId, secret })
              setRotating(null)
            }}
          />
        )}
        {revokingGrants && (
          <ConfirmDialog
            open={!!revokingGrants}
            onOpenChange={(o) => !o && setRevokingGrants(null)}
            title={`Revoke all ${revokingGrants.usersAuthorised} user grants?`}
            description={`Every person who approved ${revokingGrants.name} is signed out of it and must approve it again. The client stays registered.`}
            confirmLabel="Revoke grants"
            destructive
            onConfirm={() => { updateOAuthClient(revokingGrants.id, { usersAuthorised: 0 }); toast.success("User grants revoked", { description: revokingGrants.name }); setRevokingGrants(null) }}
          />
        )}
        {deleting && (
          <DeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete ${deleting.name}?`}
            objectName={deleting.name}
            description="The client id stops working and every user grant is removed."
            consequence={deleting.usersAuthorised ? `${num(deleting.usersAuthorised)} ${deleting.usersAuthorised === 1 ? "person loses" : "people lose"} access through this application.` : undefined}
            onConfirm={() => { deleteOAuthClient(deleting.id); toast.success("OAuth client deleted", { description: deleting.name }) }}
          />
        )}
      </div>
    </AdminOnly>
  )
}
