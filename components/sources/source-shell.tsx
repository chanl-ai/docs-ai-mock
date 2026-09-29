"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, CircleDashed, Copy, Pause, Play, RefreshCw, RotateCcw, SearchX, ShieldAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { SensitivityBadge, SourceStatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/states"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { AdminOnly } from "@/components/shared/role-gate"
import { Section } from "@/components/shared/surface"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num } from "@/lib/format"
import { SourceTypeIcon, sourceTypeMeta } from "@/lib/mock/source-types"
import { runningRunFor, SourceDeleteDialog, useRouteSource } from "./source-helpers"

const tabs = [
  { value: "overview", label: "Overview", suffix: "" },
  { value: "items", label: "Items", suffix: "/items" },
  { value: "history", label: "History", suffix: "/history" },
  { value: "settings", label: "Settings", suffix: "/settings" },
]

export function SourceShell({ children }: { children: ReactNode }) {
  return (
    <AdminOnly>
      <SourceShellInner>{children}</SourceShellInner>
    </AdminOnly>
  )
}

function SourceShellInner({ children }: { children: ReactNode }) {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const { base } = useWs()
  const { id, source } = useRouteSource()
  const runs = useMock((s) => s.runs)
  const syncSource = useMock((s) => s.syncSource)
  const pauseSource = useMock((s) => s.pauseSource)
  const [fullOpen, setFullOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-80 max-w-full" />
        {children}
      </div>
    )
  }

  if (!source) {
    return (
      <Section flush>
        <EmptyState
          icon={SearchX}
          title="Source not found"
          description={<>No source with the id <span className="font-mono text-xs">{id}</span> exists in this workspace. It may have been deleted.</>}
          action={{ label: "Back to sources", href: `${base}/sources` }}
        />
      </Section>
    )
  }

  const meta = sourceTypeMeta(source.type)
  const sbase = `${base}/sources/${source.id}`
  const running = runningRunFor(runs, source.id)
  const current = tabs.find((t) => t.suffix && pathname.endsWith(t.suffix))?.value ?? "overview"
  const itemTotal = source.itemsIndexed + source.itemsFailed + source.itemsPending

  const sync = () => {
    syncSource(source.id)
    toast.success("Sync started", { description: `${source.name} · incremental from the saved cursor` })
  }
  const togglePause = () => {
    const pausing = source.status !== "paused"
    pauseSource(source.id, pausing)
    toast.success(pausing ? "Schedule paused" : "Schedule resumed", { description: source.name })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <SourceTypeIcon type={source.type} className="size-5 shrink-0 text-muted-foreground" />
            {source.name}
          </span>
        }
        badge={<SourceStatusBadge status={source.status} />}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-normal">{meta.label}</Badge>
            {source.connectionLabel && <Badge variant="outline" className="max-w-full truncate font-mono text-xs font-normal">{source.connectionLabel}</Badge>}
            {source.reprocessPending && <Badge variant="secondary" className="font-normal"><RotateCcw className="size-3" /> Settings changed, reprocess pending</Badge>}
          </span>
        }
        scope={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SensitivityBadge level={source.sensitivity} />
            <span>Collection: <span className="text-foreground">{source.collection || "General"}</span></span>
            <span>Owner: <span className="text-foreground">{source.owner}</span></span>
            <span className="font-mono">{source.id}</span>
          </span>
        }
        actions={
          <div className="flex items-center">
            <Button size="sm" className="rounded-r-none" disabled={!!running || source.status === "revoked"} onClick={sync}>
              <RefreshCw className="size-4" /> {running ? "Syncing…" : "Sync now"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="More sync actions">
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!!running || source.status === "revoked"} onClick={() => setFullOpen(true)}><RefreshCw className="size-4" /> Full resync</DropdownMenuItem>
                <DropdownMenuItem disabled={source.status === "draft" || source.status === "revoked"} onClick={togglePause}>
                  {source.status === "paused" ? <><Play className="size-4" /> Resume schedule</> : <><Pause className="size-4" /> Pause schedule</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`${base}/sources/new?type=${source.type}`)}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        tabs={
          <Tabs value={current} className="overflow-x-auto">
            <TabsList>
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} asChild>
                  <Link href={`${sbase}${t.suffix}`}>{t.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {source.status === "revoked" && (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Connection to {meta.short} was revoked; reconnect to resume</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Syncs stop until the connection is restored. Indexed items stay searchable but will not update.</p>
            <Button asChild size="sm" variant="outline" className="border-destructive/40 text-foreground">
              <Link href={`${base}/integrations`}>Reconnect in Integrations</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {source.status === "paused" && (
        <Alert>
          <Pause className="size-4" />
          <AlertTitle>Schedule paused</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Scheduled syncs are skipped. Sync now still runs a one-off sync.</p>
            <Button size="sm" variant="outline" onClick={togglePause}><Play className="size-4" /> Resume</Button>
          </AlertDescription>
        </Alert>
      )}
      {source.status === "draft" && (
        <Alert>
          <CircleDashed className="size-4" />
          <AlertTitle>Draft; finish setup</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>This source was saved before setup was complete. It will not sync until it is finished.</p>
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/sources/new?type=${source.type}`}>Finish setup</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {children}

      <ConfirmDialog
        open={fullOpen}
        onOpenChange={setFullOpen}
        title="Run a full resync?"
        description={`A full resync ignores the saved cursor and lists every item again (about ${num(itemTotal)}). Items not seen at the source are removed from the index. It takes longer than an incremental sync.`}
        confirmLabel="Full resync"
        onConfirm={() => { syncSource(source.id, { full: true }); toast.success("Full resync started", { description: source.name }) }}
      />
      <SourceDeleteDialog source={source} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => router.push(`${base}/sources`)} />
    </div>
  )
}
