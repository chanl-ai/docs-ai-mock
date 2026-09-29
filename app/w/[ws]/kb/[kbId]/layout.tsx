"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Play, ChevronDown, RefreshCw, Copy, Download, Trash2, Database } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { KbHealthBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/states"
import { DeleteDialog } from "@/components/shared/dialogs"
import { KbDot } from "@/components/knowledge/kb-dot"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { useRole } from "@/hooks/use-role"
import { relative } from "@/lib/format"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "", label: "Overview" },
  { key: "sources", label: "Sources", admin: true },
  { key: "documents", label: "Documents" },
  { key: "retrieval", label: "Retrieval" },
  { key: "playground", label: "Playground" },
  { key: "api", label: "API" },
  { key: "analytics", label: "Analytics", admin: true },
  { key: "access", label: "Access", admin: true },
  { key: "evals", label: "Evals" },
  { key: "curation", label: "Curation", admin: true },
  { key: "proposals", label: "Proposals" },
]

export default function KbLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ kbId: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))
  const proposals = useMock((s) => s.proposals.filter((p) => p.kbId === params.kbId && p.status === "pending").length)
  const curation = useMock((s) => s.curation.filter((c) => c.kbId === params.kbId && c.status === "open").length)
  const apiKeys = useMock((s) => s.apiKeys)
  const tokens = useMock((s) => s.mcpTokens)
  const refreshKb = useMock((s) => s.refreshKb)
  const duplicateKb = useMock((s) => s.duplicateKb)
  const deleteKb = useMock((s) => s.deleteKb)
  const [deleting, setDeleting] = useState(false)

  if (!kb) {
    return (
      <div className="rounded-lg border">
        <EmptyState icon={Database} title="Knowledge base not found" description="It may have been deleted, or the link is from another workspace." action={{ label: "Back to knowledge bases", href: `${base}/kb` }} />
      </div>
    )
  }

  const root = `${base}/kb/${kb.id}`
  const active = pathname === root ? "" : pathname.slice(root.length + 1).split("/")[0]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <KbDot color={kb.color} className="size-3" />
            {kb.name}
          </span>
        }
        badge={<KbHealthBadge health={kb.health} />}
        description={kb.description}
        scope={
          <span>
            Last refreshed {relative(kb.lastRefreshedAt)} · {kb.collections.length ? `Collections: ${kb.collections.join(", ")}` : "All collections"} · <span className="font-mono">{kb.slug}</span>
          </span>
        }
        actions={
          <div className="flex items-center">
            <Button size="sm" className="rounded-r-none" onClick={() => router.push(`${root}/playground`)}>
              <Play className="size-4" /> Open playground
            </Button>
            {admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="More actions">
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { refreshKb(kb.id); toast.success("Index refresh started") }}><RefreshCw className="size-4" /> Refresh index</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { const c = duplicateKb(kb.id); toast.success("Duplicated", { description: "Settings and source links copied, not chunks." }); router.push(`${base}/kb/${c.id}`) }}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.message("Export started", { description: "You will get a download link when the zip is ready." })}><Download className="size-4" /> Export</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
        tabs={
          <nav className="-mb-px overflow-x-auto border-b">
            <ul className="flex min-w-max gap-1">
              {TABS.filter((t) => admin || !t.admin).map((t) => {
                const isActive = active === t.key
                const count = t.key === "proposals" ? proposals : t.key === "curation" ? curation : 0
                return (
                  <li key={t.key}>
                    <Link href={t.key ? `${root}/${t.key}` : root} className={cn("inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors", isActive ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                      {t.label}
                      {count > 0 && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 font-normal tabular-nums">{count}</Badge>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        }
      />
      {children}
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${kb.name}?`}
        objectName={kb.name}
        description="The index and its retrieval settings are removed. Sources and their items are kept."
        dependents={[
          { kind: "API key", names: apiKeys.filter((k) => k.kbIds.includes(kb.id)).map((k) => k.name) },
          { kind: "MCP token", names: tokens.filter((t) => t.status === "active" && (t.kbIds.length === 0 || t.kbIds.includes(kb.id))).map((t) => t.name) },
          { kind: "share link", names: kb.access.publicLink.enabled ? [`/share/kb/${kb.access.publicLink.slug}`] : [] },
        ]}
        onConfirm={() => { deleteKb(kb.id); toast.success("Knowledge base deleted"); router.push(`${base}/kb`) }}
      />
    </div>
  )
}
