"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, KeyRound, ListTree, Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/shared/page-header"
import { Row, Rows, Section } from "@/components/shared/surface"
import { CopyableField, useCopy } from "@/components/shared/copy"
import { CodeBlock } from "@/components/shared/code-sample"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, SortHeader } from "@/components/shared/data-table"
import { EmptyState, PageStateGate, TableSkeleton } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { daysUntil, relative, shortDate } from "@/lib/format"
import type { McpToken } from "@/lib/mock/types"
import { cn } from "@/lib/utils"
import { CreateTokenDialog } from "./create-token-dialog"
import { FIXED_PROMPTS, mcpBase, mcpHttpUrl, mcpSseUrl } from "./connect-helpers"

function TokenStatusBadge({ status }: { status: McpToken["status"] }) {
  if (status === "active") return <StatusBadge tone="good" icon={CheckCircle2} label="Active" />
  if (status === "expired") return <StatusBadge tone="neutral" icon={Clock} label="Expired" />
  return <StatusBadge tone="bad" icon={CircleSlash} label="Revoked" />
}

export function McpServerView() {
  const state = usePageState()
  const { slug, base } = useWs()
  const { admin } = useRole()
  const user = useMock((s) => s.user)
  const kbs = useMock((s) => s.kbs)
  const tools = useMock((s) => s.tools)
  const allTokens = useMock((s) => s.mcpTokens)
  const revokeToken = useMock((s) => s.revokeToken)
  const renameToken = useMock((s) => s.renameToken)
  const { copy } = useCopy()

  const [checking, setChecking] = useState(false)
  const [checkedAt, setCheckedAt] = useState<"1 min ago" | "just now">("1 min ago")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<McpToken | null>(null)
  const [renaming, setRenaming] = useState<McpToken | null>(null)
  const [newName, setNewName] = useState("")

  const unhealthy = state === "error"
  const mcpKbs = kbs.filter((k) => k.access.mcp.enabled)
  const activeTools = tools.filter((t) => t.status === "active")
  const tokens = state === "empty" ? [] : admin ? allTokens : allTokens.filter((t) => t.createdBy === user.name)

  const recheck = () => {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setCheckedAt("just now")
      if (unhealthy) toast.error("Still unreachable", { description: "upstream timeout after 10 s. The platform team has been paged." })
      else toast.success("Server healthy", { description: "Responded to initialize in 84 ms" })
    }, 1000)
  }

  const manifest = useMemo(
    () =>
      JSON.stringify(
        {
          tools: [
            ...mcpKbs.map((k) => ({ name: k.access.mcp.toolName, description: k.description })),
            ...activeTools.map((t) => ({ name: t.slug, description: t.description })),
          ],
          resources: mcpKbs.map((k) => ({ uri: `kb://${k.slug}`, name: k.name })),
          prompts: FIXED_PROMPTS,
        },
        null,
        2
      ),
    [mcpKbs, activeTools]
  )

  const kbName = (id: string) => kbs.find((k) => k.id === id)?.name ?? id

  const columns = useMemo<ColumnDef<McpToken>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{row.original.prefix}</div>
          </div>
        ),
        filterFn: (row, _id, value: string) => row.original.name.toLowerCase().includes(value.toLowerCase()),
      },
      {
        id: "scopes",
        header: "Scopes",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.scopes.map((s) => <Badge key={s} variant="secondary" className="font-mono text-[11px]">{s}</Badge>)}
          </div>
        ),
      },
      {
        id: "kbs",
        header: "Knowledge bases",
        cell: ({ row }) =>
          row.original.kbIds.length === 0 ? (
            "All"
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default tabular-nums underline decoration-dotted underline-offset-4">{row.original.kbIds.length}</span>
              </TooltipTrigger>
              <TooltipContent><ul className="text-xs">{row.original.kbIds.map((id) => <li key={id}>{kbName(id)}</li>)}</ul></TooltipContent>
            </Tooltip>
          ),
      },
      { accessorKey: "createdBy", header: "Created by", cell: ({ row }) => <span className="whitespace-nowrap">{row.original.createdBy}</span> },
      {
        id: "expires",
        accessorFn: (r) => r.expiresAt ?? "9999",
        header: ({ column }) => <SortHeader column={column} title="Expires" />,
        cell: ({ row }) => {
          const t = row.original
          if (!t.expiresAt) return <span className="text-muted-foreground">Never</span>
          const d = daysUntil(t.expiresAt) ?? 0
          if (t.status === "active" && d <= 7) return <StatusBadge tone="warn" icon={AlertTriangle} label={`In ${d} d`} />
          return <span className="whitespace-nowrap text-muted-foreground">{shortDate(t.expiresAt)}</span>
        },
      },
      { id: "lastUsed", accessorFn: (r) => r.lastUsedAt ?? "", header: ({ column }) => <SortHeader column={column} title="Last used" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.lastUsedAt ? relative(row.original.lastUsedAt) : "Never"}</span> },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <TokenStatusBadge status={row.original.status} />, filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)) },
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
                <DropdownMenuItem onClick={() => { setRenaming(row.original); setNewName(row.original.name) }}><Pencil className="size-4" /> Edit name</DropdownMenuItem>
                <DropdownMenuItem onClick={() => copy(row.original.id, "Token id copied")}><KeyRound className="size-4" /> Copy id</DropdownMenuItem>
                {row.original.status === "active" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setRevoking(row.original)}><XCircle className="size-4" /> Revoke</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [kbs] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="MCP server and tokens"
        description="The workspace's MCP endpoint, what it exposes to AI clients, and the tokens that reach it."
        scope={admin ? "You see every token in the workspace." : "You see and manage the tokens you created."}
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create token</Button>}
      />

      {state === "loading" ? (
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-lg" />
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : (
        <>
          <Section
            title="Server"
            description="Clients use the streamable HTTP URL; SSE is kept for older clients."
            actions={
              <>
                {unhealthy ? (
                  <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> Unreachable — last error: upstream timeout</Badge>
                ) : (
                  <StatusBadge tone="good" icon={CheckCircle2} label={`Healthy · checked ${checkedAt}`} />
                )}
                <Button variant="outline" size="sm" onClick={recheck} disabled={checking}>
                  {checking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Re-check
                </Button>
              </>
            }
            flush
          >
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <CopyableField label="Streamable HTTP" value={mcpHttpUrl(slug)} />
              <CopyableField label="SSE" value={mcpSseUrl(slug)} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
              <h3 className="text-sm font-semibold">What this server exposes</h3>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><ListTree className="size-3.5" /> Preview tool list</Button>
            </div>
            <Rows className="border-t">
              <li className="bg-muted/30 px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{mcpKbs.length} knowledge tools</li>
              {mcpKbs.map((k) => <Row key={k.id} title={<span className="font-mono text-xs">{k.access.mcp.toolName}</span>} description={`${k.name} · ${k.description}`} href={`${base}/kb/${k.id}`} />)}
              <li className="bg-muted/30 px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{activeTools.length} active tools</li>
              {activeTools.map((t) => <Row key={t.id} title={<span className="font-mono text-xs">{t.slug}</span>} description={t.description} />)}
              <li className="bg-muted/30 px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{mcpKbs.length} resources</li>
              {mcpKbs.map((k) => <Row key={`r-${k.id}`} title={<span className="font-mono text-xs">kb://{k.slug}</span>} description={k.name} />)}
              <li className="bg-muted/30 px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{FIXED_PROMPTS.length} prompts</li>
              {FIXED_PROMPTS.map((p) => <Row key={p.name} title={<span className="font-mono text-xs">{p.name}</span>} description={p.description} />)}
            </Rows>
          </Section>

          <PageStateGate state={state === "error" ? "ready" : state}>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Tokens</h2>
              <DataTable
                columns={columns}
                data={tokens}
                getRowId={(r) => r.id}
                searchColumn="name"
                searchPlaceholder="Search tokens…"
                filters={[{ column: "status", title: "Status", options: [{ label: "Active", value: "active" }, { label: "Expired", value: "expired" }, { label: "Revoked", value: "revoked" }] }]}
                rowClassName={(r) => cn(r.status !== "active" && "text-muted-foreground opacity-70")}
                emptyState={
                  <div className="rounded-lg border">
                    <EmptyState
                      icon={KeyRound}
                      title="No tokens yet"
                      description="A token lets one AI client reach this server with the scopes and knowledge bases you choose. Create one per client so you can revoke it on its own."
                      action={{ label: "Create token", onClick: () => setCreateOpen(true) }}
                      secondaryAction={{ label: "Set up a client", href: `${base}/connect/clients` }}
                    />
                  </div>
                }
              />
            </div>
          </PageStateGate>
        </>
      )}

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>Tool list preview</SheetTitle>
            <SheetDescription>Exactly what a client receives from <span className="font-mono">tools/list</span>, <span className="font-mono">resources/list</span> and <span className="font-mono">prompts/list</span> at {mcpBase(slug).replace("https://", "")}.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <CodeBlock code={manifest} maxHeight={2000} />
          </div>
        </SheetContent>
      </Sheet>

      <CreateTokenDialog open={createOpen} onOpenChange={setCreateOpen} />

      {revoking && (
        <ConfirmDialog
          open={!!revoking}
          onOpenChange={(o) => !o && setRevoking(null)}
          title={`Revoke ${revoking.name}?`}
          description="Clients using this token get 401 on their next request. This cannot be undone; create a new token to reconnect."
          confirmLabel="Revoke token"
          destructive
          onConfirm={() => { revokeToken(revoking.id); toast.success("Token revoked", { description: revoking.name }); setRevoking(null) }}
        />
      )}

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit token name</DialogTitle>
            <DialogDescription>The name is only a label; the token itself does not change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tok-rename">Name</Label>
            <Input id="tok-rename" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button disabled={!newName.trim()} onClick={() => { if (renaming) { renameToken(renaming.id, newName.trim()); toast.success("Token renamed") } setRenaming(null) }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
