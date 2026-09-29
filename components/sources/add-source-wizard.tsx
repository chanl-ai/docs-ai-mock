"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Loader2, Plug, Plus, Trash2, Check, Info, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SelectableCard } from "@/components/ui/selectable-card"
import { Stepper } from "@/components/shared/stepper"
import { TagInput } from "@/components/shared/tag-input"
import { CopyableField } from "@/components/shared/copy"
import { FieldRow, Section } from "@/components/shared/surface"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { sourceTypes, sourceTypeMeta, scheduleLabel } from "@/lib/mock/source-types"
import { FileDropzone, type UploadRow } from "@/components/files/file-dropzone"
import type { ChunkStrategy, MetadataMapping, Rule, Schedule, Sensitivity, Source, SourceType } from "@/lib/mock/types"
import { cn } from "@/lib/utils"
import { bytes } from "@/lib/format"

const STEPS = ["Type", "Connection and scope", "Parsing and chunking", "Rules and metadata", "Permissions and schedule", "Review"] as const

interface TreeNode {
  id: string
  label: string
  kind: "site" | "folder" | "space" | "repo" | "page" | "category" | "drive" | "type"
  count?: number
  children?: TreeNode[]
}

const TREES: Partial<Record<SourceType, TreeNode[]>> = {
  sharepoint: [
    { id: "site-people", label: "People Operations", kind: "site", children: [{ id: "lib-docs", label: "Documents", kind: "folder", children: [{ id: "f-policies", label: "Policies", kind: "folder", count: 612 }, { id: "f-forms", label: "Forms", kind: "folder", count: 200 }, { id: "f-archive", label: "Archive", kind: "folder", count: 1_204 }] }, { id: "lib-templates", label: "Templates", kind: "folder", count: 44 }] },
    { id: "site-finance", label: "Finance", kind: "site", children: [{ id: "f-close", label: "Month-end close", kind: "folder", count: 380 }, { id: "f-audit", label: "Audit", kind: "folder", count: 120 }] },
    { id: "site-branch", label: "Branch Network", kind: "site", children: [{ id: "f-ops", label: "Operations manuals", kind: "folder", count: 96 }] },
  ],
  confluence: [
    { id: "ENG", label: "ENG · Engineering", kind: "space", count: 212 },
    { id: "PLAT", label: "PLAT · Platform", kind: "space", count: 98 },
    { id: "SRE", label: "SRE · Reliability", kind: "space", count: 70 },
    { id: "PROD", label: "PROD · Product", kind: "space", count: 340 },
    { id: "HR", label: "HR · People", kind: "space", count: 41 },
  ],
  gdrive: [
    { id: "sd-legal", label: "Legal (shared drive)", kind: "drive", children: [{ id: "g-contracts", label: "Contracts", kind: "folder", count: 58 }, { id: "g-templates", label: "Templates", kind: "folder", count: 12 }] },
    { id: "sd-marketing", label: "Marketing (shared drive)", kind: "drive", children: [{ id: "g-brand", label: "Brand", kind: "folder", count: 140 }, { id: "g-campaigns", label: "Campaigns 2026", kind: "folder", count: 322 }] },
  ],
  github: [
    { id: "platform-docs", label: "northwind-org/platform-docs", kind: "repo", count: 214 },
    { id: "api-gateway", label: "northwind-org/api-gateway", kind: "repo", count: 31 },
    { id: "mobile-app", label: "northwind-org/mobile-app", kind: "repo", count: 12 },
    { id: "infra", label: "northwind-org/infra", kind: "repo", count: 64 },
  ],
  notion: [
    { id: "n-wiki", label: "Product wiki", kind: "page", count: 88, children: [{ id: "n-specs", label: "Specs", kind: "page", count: 40 }, { id: "n-research", label: "Research repository", kind: "page", count: 22 }] },
    { id: "n-roadmap", label: "Roadmap", kind: "page", count: 14 },
    { id: "n-meetings", label: "Meeting notes", kind: "page", count: 410 },
  ],
  zendesk: [
    { id: "z-accounts", label: "Accounts", kind: "category", count: 62 },
    { id: "z-cards", label: "Cards", kind: "category", count: 48 },
    { id: "z-loans", label: "Loans and mortgages", kind: "category", count: 37 },
    { id: "z-internal", label: "Internal (agents only)", kind: "category", count: 120 },
  ],
  salesforce: [
    { id: "sf-faq", label: "FAQ", kind: "type", count: 210 },
    { id: "sf-howto", label: "How-to", kind: "type", count: 96 },
    { id: "sf-policy", label: "Policy", kind: "type", count: 44 },
  ],
}

function Tree({ nodes, checked, onToggle, depth = 0 }: { nodes: TreeNode[]; checked: string[]; onToggle: (id: string, on: boolean) => void; depth?: number }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(nodes.map((n) => [n.id, depth < 1])))
  return (
    <ul className={cn(depth > 0 && "ml-5 border-l pl-2")}>
      {nodes.map((n) => {
        const hasKids = !!n.children?.length
        const isOpen = open[n.id]
        return (
          <li key={n.id}>
            <div className="flex items-center gap-1.5 rounded px-1 py-1 text-sm hover:bg-accent/60">
              {hasKids ? (
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [n.id]: !o[n.id] }))} className="rounded p-0.5 text-muted-foreground" aria-label={isOpen ? "Collapse" : "Expand"}>
                  {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
              ) : (
                <span className="w-[18px]" />
              )}
              <Checkbox checked={checked.includes(n.id)} onCheckedChange={(v) => onToggle(n.id, !!v)} id={`node-${n.id}`} />
              {n.kind === "folder" ? isOpen ? <FolderOpen className="size-4 text-muted-foreground" /> : <Folder className="size-4 text-muted-foreground" /> : <FileText className="size-4 text-muted-foreground" />}
              <label htmlFor={`node-${n.id}`} className="flex-1 cursor-pointer truncate">{n.label}</label>
              {n.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{n.count.toLocaleString()}</span>}
            </div>
            {hasKids && isOpen && <Tree nodes={n.children!} checked={checked} onToggle={onToggle} depth={depth + 1} />}
          </li>
        )
      })}
    </ul>
  )
}

function countFor(nodes: TreeNode[], ids: string[]): number {
  let n = 0
  const walk = (list: TreeNode[], parentChecked: boolean) => {
    for (const node of list) {
      const on = parentChecked || ids.includes(node.id)
      if (on && node.count) n += node.count
      if (node.children) walk(node.children, on)
    }
  }
  walk(nodes, false)
  return n
}

export interface WizardDraft {
  type?: SourceType
  name: string
  connectionId?: string
  scope: string[]
  urls: string
  startUrl: string
  depth: number
  maxPages: number
  includePaths: string
  excludePaths: string
  text: string
  files: UploadRow[]
  libraryFileIds: string[]
  ocr: boolean
  tables: boolean
  vision: boolean
  removeHtml: boolean
  strategy: ChunkStrategy
  size: number
  overlap: number
  language: string
  rules: Rule[]
  mapping: MetadataMapping[]
  tags: string[]
  titleFrom: "source" | "heading" | "filename"
  sensitivity: Sensitivity
  collection: string
  permissions: "inherit" | "workspace" | "selected"
  principals: string[]
  schedule: Schedule
  subscribe: boolean
  deletedAtSource: "remove" | "keep_stale"
  staleAfter: number
  notify: boolean
  kbIds: string[]
}

const emptyDraft = (): WizardDraft => ({
  name: "",
  scope: [],
  urls: "",
  startUrl: "",
  depth: 2,
  maxPages: 200,
  includePaths: "",
  excludePaths: "",
  text: "",
  files: [],
  libraryFileIds: [],
  ocr: false,
  tables: true,
  vision: false,
  removeHtml: true,
  strategy: "structure",
  size: 512,
  overlap: 50,
  language: "auto",
  rules: [],
  mapping: [{ key: "locale", from: "static:en" }],
  tags: [],
  titleFrom: "source",
  sensitivity: "internal",
  collection: "",
  permissions: "workspace",
  principals: [],
  schedule: { kind: "manual" },
  subscribe: true,
  deletedAtSource: "remove",
  staleAfter: 90,
  notify: true,
  kbIds: [],
})

const strategyInfo: { value: ChunkStrategy; label: string; description: string; llm?: boolean }[] = [
  { value: "structure", label: "Structure aware", description: "Headings, paragraphs and sentences. Fast and predictable." },
  { value: "topics", label: "Smart topics", description: "A model groups content by topic before chunking.", llm: true },
  { value: "faq", label: "FAQ optimised", description: "Generates sample questions per section so questions match better.", llm: true },
  { value: "headers", label: "Topic headers", description: "Adds a one-line context summary to each chunk.", llm: true },
  { value: "summarise", label: "Summarise", description: "Key points only. Smaller index, less detail.", llm: true },
  { value: "rows", label: "Rows", description: "Tables only: each row is a chunk, headers become field names." },
]

const ruleFields = [
  { value: "path", label: "Path glob" },
  { value: "title", label: "Title contains" },
  { value: "mime", label: "MIME type" },
  { value: "modifiedAfter", label: "Modified after" },
  { value: "sizeUnder", label: "Size under" },
] as const

export function AddSourceWizard({ mode = "page", onDone, initialType, prefill }: { mode?: "page" | "sheet"; onDone?: (source?: Source) => void; initialType?: SourceType; prefill?: Partial<WizardDraft> }) {
  const router = useRouter()
  const params = useSearchParams()
  const { base } = useWs()
  const integrations = useMock((s) => s.integrations)
  const kbs = useMock((s) => s.kbs)
  const files = useMock((s) => s.files)
  const sources = useMock((s) => s.sources)
  const settings = useMock((s) => s.settings)
  const createSource = useMock((s) => s.createSource)
  const connectIntegration = useMock((s) => s.connectIntegration)
  const [step, setStep] = useState(1)
  const [d, setD] = useState<WizardDraft>(() => ({ ...emptyDraft(), staleAfter: settings.knowledgeDefaults.staleAfterDays, size: settings.knowledgeDefaults.chunkSize, overlap: settings.knowledgeDefaults.overlap, ...prefill }))
  const [connectFor, setConnectFor] = useState<SourceType | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [validation, setValidation] = useState<{ ok: boolean; message: string } | null>(null)
  const [preview, setPreview] = useState<{ title: string; path: string; size: number; modified: string }[] | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [chunkPreview, setChunkPreview] = useState<string[] | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = (initialType ?? params.get("type")) as SourceType | null
    if (t && sourceTypes.some((s) => s.type === t) && !d.type) {
      setD((x) => ({ ...x, type: t }))
      setStep(2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meta = d.type ? sourceTypeMeta(d.type) : undefined
  const integration = meta?.integrationType ? integrations.find((i) => i.type === meta.integrationType) : undefined
  const needsConnection = !!meta?.integrationType && integration?.status !== "connected"
  const tree = d.type ? TREES[d.type] : undefined
  const scopeCount = tree ? countFor(tree, d.scope) : 0
  const previewCount = preview?.length ?? 0
  const matched = useMemo(() => {
    if (!preview) return 0
    return preview.filter((p) => !d.rules.some((r) => r.kind === "exclude" && r.value && (r.field === "path" ? p.path.toLowerCase().includes(r.value.replace(/\*/g, "").replace(/\/+$/, "").toLowerCase()) : r.field === "title" ? p.title.toLowerCase().includes(r.value.toLowerCase()) : false))).length
  }, [preview, d.rules])

  const set = <K extends keyof WizardDraft>(k: K, v: WizardDraft[K]) => setD((x) => ({ ...x, [k]: v }))

  const patch = (p: Partial<WizardDraft>) => setD((x) => ({ ...x, ...p }))

  const runPreview = () => {
    setPreviewing(true)
    setValidation(null)
    setTimeout(() => {
      if (d.type === "crawl" && d.startUrl.includes("10.0.")) {
        setValidation({ ok: false, message: "URL resolves to a private IP range (10.0.0.0/8). Crawls must target a public host." })
        setPreviewing(false)
        return
      }
      const n = d.type === "sharepoint" ? Math.min(scopeCount, 50) : d.type === "file" ? d.files.length + d.libraryFileIds.length : d.type === "url" ? d.urls.split("\n").filter(Boolean).length : d.type === "crawl" ? 24 : d.type === "text" ? 1 : Math.min(scopeCount, 50)
      const rows = Array.from({ length: Math.max(n, 0) }, (_, i) => ({
        title: d.type === "sharepoint" ? ["Parental leave policy", "Expense reimbursement policy", "Code of conduct", "Onboarding checklist", "Travel policy"][i % 5] + (i > 4 ? ` — v${i}` : "") : d.type === "crawl" ? `Pricing · ${["overview", "chequing", "savings", "mortgages", "fees"][i % 5]} ${i > 4 ? i : ""}` : d.type === "file" ? [...d.files.map((f) => f.name), ...d.libraryFileIds.map((id) => files.find((f) => f.id === id)?.name ?? id)][i] : d.type === "url" ? d.urls.split("\n").filter(Boolean)[i] : d.type === "github" ? `docs/${["api/authentication", "api/rate-limits", "guides/quickstart", "reference/accounts", "sdk/python"][i % 5]}.md` : d.type === "text" ? "Pasted text" : `${meta?.label} item ${i + 1}`,
        path: d.type === "sharepoint" ? `Documents/${i % 7 === 3 ? "Archive" : "Policies"}/file-${i}.pdf` : d.type === "crawl" ? `/pricing/${["", "chequing", "savings", "mortgages", "fees"][i % 5]}` : d.type === "github" ? `docs/${["api/authentication", "api/rate-limits", "guides/quickstart", "reference/accounts", "sdk/python"][i % 5]}.md` : `item-${i}`,
        size: 20_000 + ((i * 7919) % 900_000),
        modified: new Date(Date.now() - i * 3 * 86400_000).toISOString().slice(0, 10),
      }))
      setPreview(rows)
      setValidation({ ok: true, message: `Connection OK · ${rows.length} item${rows.length === 1 ? "" : "s"} would be fetched${d.type === "crawl" ? " (48 links discovered from the start page)" : ""}` })
      setPreviewing(false)
    }, 900)
  }

  const validateStep = (): string | null => {
    if (step === 1 && !d.type) return "Pick a source type"
    if (step === 2) {
      if (d.name.trim().length < 2 || d.name.length > 80) return "Name is 2 to 80 characters"
      if (sources.some((s) => s.name.trim().toLowerCase() === d.name.trim().toLowerCase())) return "A source with this name already exists"
      if (needsConnection) return `Connect ${meta?.label} first`
      if (tree && !d.scope.length) return "Pick at least one item to fetch"
      if (d.type === "url" && !d.urls.trim()) return "Add at least one URL"
      if (d.type === "url" && d.urls.split("\n").filter(Boolean).some((u) => !/^https?:\/\//.test(u.trim()))) return "URLs must start with http:// or https://"
      if (d.type === "crawl" && !/^https?:\/\//.test(d.startUrl)) return "Start URL must be http(s)"
      if (d.type === "crawl" && (d.depth < 1 || d.depth > 5)) return "Depth is 1 to 5"
      if (d.type === "crawl" && (d.maxPages < 10 || d.maxPages > 5000)) return "Max pages is 10 to 5000"
      if (d.type === "text" && !d.text.trim()) return "Paste some text"
      if (d.type === "file" && !d.files.length && !d.libraryFileIds.length) return "Add at least one file"
      if (validation && !validation.ok) return validation.message
    }
    if (step === 3 && d.strategy !== "rows" && (d.size < 100 || d.size > 2000)) return "Chunk size is 100 to 2000"
    return null
  }

  const next = () => {
    const e = validateStep()
    setError(e)
    if (e) return
    setStep((s) => Math.min(6, s + 1))
  }

  const buildSource = (status: Source["status"] = "active"): Parameters<typeof createSource>[0] => ({
    type: d.type!,
    name: d.name.trim(),
    status,
    connectionId: integration?.id,
    connectionLabel: integration?.connectedAs,
    scopeSummary:
      d.type === "file" ? `${d.files.length + d.libraryFileIds.length} files` : d.type === "url" ? `${d.urls.split("\n").filter(Boolean).length} URLs` : d.type === "crawl" ? `${d.startUrl} · depth ${d.depth} · ${d.maxPages} pages max` : d.type === "text" ? `Pasted Markdown · ${d.text.split(/\s+/).length} words` : `${d.scope.length} ${meta?.scopeLabel.toLowerCase()} selected`,
    config: { scope: d.scope, urls: d.urls, startUrl: d.startUrl, depth: d.depth, maxPages: d.maxPages },
    parsing: { ocr: d.ocr, tables: d.tables, vision: d.vision, removeHtml: d.removeHtml },
    chunking: { strategy: d.strategy, size: d.size, overlap: d.overlap, language: d.language },
    rules: d.rules.filter((r) => r.value),
    metadataMapping: d.mapping.filter((m) => m.key),
    tags: d.tags,
    titleFrom: d.titleFrom,
    permissions: d.permissions === "selected" ? { mode: "selected", principals: d.principals } : d.permissions === "inherit" ? { mode: "inherit" } : { mode: "workspace" },
    schedule: d.schedule,
    deletedAtSource: d.deletedAtSource,
    staleAfterDays: d.staleAfter,
    notifyOnFailure: d.notify,
    sensitivity: d.sensitivity,
    collection: d.collection || "General",
    itemsIndexed: 0,
    itemsPending: preview?.length ?? scopeCount ?? 0,
  })

  const finish = (sync: boolean) => {
    const src = createSource(buildSource(), { sync, kbIds: d.kbIds })
    if (d.type === "file" && d.libraryFileIds.length) useMock.getState().addFilesToSource(d.libraryFileIds, src.id)
    toast.success(sync ? "Source created, sync started" : "Source created", { description: src.name })
    if (onDone) onDone(src)
    else router.push(`${base}/sources/${src.id}`)
  }

  const saveDraft = () => {
    if (!d.type || d.name.trim().length < 2) {
      setError("Give the source a name before saving a draft")
      return
    }
    const src = createSource(buildSource("draft"))
    toast.message("Draft saved", { description: "Finish setup from the source page." })
    if (onDone) onDone(src)
    else router.push(`${base}/sources/${src.id}`)
  }

  const doConnect = () => {
    setConnecting(true)
    setTimeout(() => {
      if (integration) connectIntegration(integration.id, integration.type === "sharepoint" ? "northwind.sharepoint.com (app-only)" : `${useMock.getState().user.email}`)
      setConnecting(false)
      setConnectFor(null)
      toast.success(`${meta?.label} connected`)
    }, 1100)
  }

  const quotaExceeded = (preview?.reduce((n, p) => n + p.size, 0) ?? 0) > 2 * 1024 ** 3

  const stepBody = (
    <>
      {step === 1 && (
        <div className="space-y-6">
          {(["Content you provide", "Connected apps"] as const).map((group) => (
            <div key={group} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sourceTypes.filter((t) => t.group === group).map((t) => {
                  const int = t.integrationType ? integrations.find((i) => i.type === t.integrationType) : undefined
                  const needs = !!t.integrationType && int?.status !== "connected"
                  return (
                    <SelectableCard
                      key={t.type}
                      selected={d.type === t.type}
                      onSelect={() => { patch({ type: t.type, strategy: t.type === "text" ? "faq" : "structure", removeHtml: t.type === "crawl" || t.type === "url", permissions: t.supportsInherit ? "inherit" : "workspace", schedule: t.type === "file" || t.type === "text" ? { kind: "manual" } : t.supportsWebhook ? { kind: "webhook", safetyNetDaily: true } : { kind: "daily", time: "02:00" } }); setPreview(null); setValidation(null) }}
                      icon={<t.icon className="size-5" />}
                      title={t.label}
                      description={t.description}
                      badge={needs ? "Needs connection" : undefined}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 2 && meta && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="src-name">Name</Label>
            <Input id="src-name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder={meta.type === "sharepoint" ? "HR policies" : meta.type === "crawl" ? "Pricing site" : `${meta.label} source`} autoFocus />
          </div>

          {meta.integrationType && (
            <div className="space-y-2">
              <Label>Connection</Label>
              {integration?.status === "connected" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Check className="size-4 text-emerald-600" />
                  <span className="font-medium">{integration.name}</span>
                  <span className="text-muted-foreground">{integration.connectedAs}</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setConnectFor(meta.type)}>Connect another</Button>
                </div>
              ) : (
                <Alert>
                  <Plug className="size-4" />
                  <AlertTitle>{integration?.status === "needs_reauth" ? `${meta.label} needs to be reconnected` : `${meta.label} is not connected`}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{integration?.status === "needs_reauth" ? "The saved token expired. Reconnect to keep syncing." : `Connect once for the whole workspace; every source of this type reuses it.`}</p>
                    <Button size="sm" onClick={() => setConnectFor(meta.type)}>{integration?.status === "needs_reauth" ? "Reconnect" : "Connect"} {meta.label}</Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {tree && !needsConnection && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{meta.scopeLabel}</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{d.scope.length} selected · about {scopeCount.toLocaleString()} items</span>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border p-2">
                <Tree nodes={tree} checked={d.scope} onToggle={(id, on) => set("scope", on ? [...d.scope, id] : d.scope.filter((x) => x !== id))} />
              </div>
              {meta.type === "github" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Branch</Label><Input defaultValue="main" /></div>
                  <div className="space-y-1.5"><Label>Path globs</Label><Input defaultValue="docs/**, **/*.md" /></div>
                </div>
              )}
              {meta.type === "confluence" && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>Include attachments</span>
                  <Switch defaultChecked />
                </div>
              )}
              {meta.type === "zendesk" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Locales</Label><Input defaultValue="en-ca" /></div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Published only</span><Switch defaultChecked /></div>
                </div>
              )}
            </div>
          )}

          {meta.type === "file" && (
            <div className="space-y-3">
              <Label>Files</Label>
              <FileDropzone rows={d.files} onChange={(rows) => set("files", rows)} compact />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>Choose from library</Button>
                {d.libraryFileIds.length > 0 && <span className="text-xs text-muted-foreground">{d.libraryFileIds.length} from the library</span>}
              </div>
              {d.libraryFileIds.length > 0 && (
                <ul className="divide-y rounded-md border text-sm">
                  {d.libraryFileIds.map((id) => {
                    const f = files.find((x) => x.id === id)
                    return (
                      <li key={id} className="flex items-center gap-2 px-3 py-1.5">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{f?.name ?? id}</span>
                        <span className="text-xs text-muted-foreground">{f ? bytes(f.sizeBytes) : ""}</span>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => set("libraryFileIds", d.libraryFileIds.filter((x) => x !== id))} aria-label="Remove"><Trash2 className="size-3.5" /></Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {meta.type === "url" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="urls">URLs, one per line</Label>
                <Textarea id="urls" rows={5} value={d.urls} onChange={(e) => set("urls", e.target.value)} placeholder={"https://intranet.northwind.example/it/vpn-guide\nhttps://intranet.northwind.example/it/mfa"} className="font-mono text-xs" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Header auth (optional)</Label><Select defaultValue="none"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="INTRANET_BASIC_AUTH">Secret INTRANET_BASIC_AUTH</SelectItem></SelectContent></Select></div>
              </div>
            </div>
          )}

          {meta.type === "crawl" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start URL or sitemap</Label>
                <Input id="start" value={d.startUrl} onChange={(e) => set("startUrl", e.target.value)} placeholder="https://www.northwind.example/sitemap.xml" className="font-mono text-xs" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5"><Label>Depth (1 to 5)</Label><Input type="number" min={1} max={5} value={d.depth} onChange={(e) => set("depth", Number(e.target.value))} /></div>
                <div className="space-y-1.5"><Label>Max pages (10 to 5000)</Label><Input type="number" min={10} max={5000} value={d.maxPages} onChange={(e) => set("maxPages", Number(e.target.value))} /></div>
                <div className="flex items-end"><div className="flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm"><span>Same domain only</span><Switch defaultChecked /></div></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Include paths</Label><Input value={d.includePaths} onChange={(e) => set("includePaths", e.target.value)} placeholder="/pricing/**, /fees/**" className="font-mono text-xs" /></div>
                <div className="space-y-1.5"><Label>Exclude paths</Label><Input value={d.excludePaths} onChange={(e) => set("excludePaths", e.target.value)} placeholder="/pricing/archive/**" className="font-mono text-xs" /></div>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Respect robots.txt</span><Switch defaultChecked /></div>
            </div>
          )}

          {meta.type === "text" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="text">Markdown</Label>
                <Textarea id="text" rows={8} value={d.text} onChange={(e) => set("text", e.target.value)} placeholder={"# Branch FAQ\n\n## Q: What are the Halifax branch hours?\nMonday to Friday 9:30 to 17:00."} className="font-mono text-xs" />
              </div>
              <p className="text-xs text-muted-foreground">Or drop a CSV or XLSX to map columns to Title, Content and metadata keys.</p>
              <FileDropzone rows={d.files} onChange={(rows) => set("files", rows)} compact accept={[".csv", ".xlsx"]} />
              {d.files.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Column</TableHead><TableHead>Use as</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {["question", "answer", "category", "updated"].map((c, i) => (
                      <TableRow key={c}><TableCell className="font-mono text-xs">{c}</TableCell><TableCell><Select defaultValue={["title", "content", "metadata", "ignore"][i]}><SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="title">Title</SelectItem><SelectItem value="content">Content</SelectItem><SelectItem value="metadata">Metadata key</SelectItem><SelectItem value="ignore">Ignore</SelectItem></SelectContent></Select></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {!needsConnection && meta.type !== "text" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={runPreview} disabled={previewing}>
                  {previewing && <Loader2 className="size-3.5 animate-spin" />} Preview
                </Button>
                {validation && <span className={cn("text-xs", validation.ok ? "text-emerald-600" : "text-destructive")}>{validation.message}</span>}
              </div>
              {preview && preview.length === 0 && <p className="text-sm text-muted-foreground">No items match; widen the scope or rules.</p>}
              {preview && preview.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Path</TableHead><TableHead className="text-right">Size</TableHead><TableHead>Modified</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {preview.slice(0, 8).map((p, i) => (
                        <TableRow key={i}><TableCell className="max-w-[220px] truncate">{p.title}</TableCell><TableCell className="max-w-[240px] truncate font-mono text-xs text-muted-foreground">{p.path}</TableCell><TableCell className="text-right tabular-nums">{bytes(p.size)}</TableCell><TableCell className="text-muted-foreground">{p.modified}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {preview.length > 8 && <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">and {preview.length - 8} more</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: "ocr" as const, label: "OCR", tip: "Runs on scanned PDFs and images. Slower and uses credits." },
              { k: "tables" as const, label: "Table extraction", tip: "Tables in PDF and DOCX become row chunks with headers as field names, so fee schedules come back as values." },
              { k: "vision" as const, label: "Vision for figures", tip: "Describes images and charts into text." },
              { k: "removeHtml" as const, label: "Remove HTML and boilerplate", tip: "Strips navigation, footers and scripts from web pages." },
            ].map((o) => (
              <div key={o.k} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-1.5 text-sm">
                  {o.label}
                  <Tooltip><TooltipTrigger asChild><Info className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent className="max-w-xs">{o.tip}</TooltipContent></Tooltip>
                </div>
                <Switch checked={d[o.k]} onCheckedChange={(v) => set(o.k, v)} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Chunking strategy</Label>
            <RadioGroup value={d.strategy} onValueChange={(v) => set("strategy", v as ChunkStrategy)} className="grid gap-2 sm:grid-cols-2">
              {strategyInfo.map((s) => (
                <label key={s.value} htmlFor={`strat-${s.value}`} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.strategy === s.value && "border-primary bg-primary/5")}>
                  <RadioGroupItem value={s.value} id={`strat-${s.value}`} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">{s.label}{s.llm && <Badge variant="outline" className="font-normal">Uses credits on each sync</Badge>}</div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className={cn("grid gap-6 sm:grid-cols-2", d.strategy === "rows" && "opacity-50")}>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Chunk size (tokens)</Label><Input type="number" className="h-7 w-20 text-right" value={d.size} min={100} max={2000} onChange={(e) => set("size", Number(e.target.value))} disabled={d.strategy === "rows"} /></div>
              <Slider value={[d.size]} min={100} max={2000} step={16} onValueChange={([v]) => set("size", v)} disabled={d.strategy === "rows"} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Overlap (tokens)</Label><Input type="number" className="h-7 w-20 text-right" value={d.overlap} min={0} max={500} onChange={(e) => set("overlap", Number(e.target.value))} disabled={d.strategy === "rows"} /></div>
              <Slider value={[d.overlap]} min={0} max={500} step={10} onValueChange={([v]) => set("overlap", v)} disabled={d.strategy === "rows"} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={d.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="auto">Auto detect</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="fr">French</SelectItem><SelectItem value="es">Spanish</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => { setChunkPreview(null); setTimeout(() => setChunkPreview(Array.from({ length: 10 }, (_, i) => d.strategy === "faq" ? `Q: ${["What is the refund window?", "Who approves expenses over $500?", "How many vacation days do new hires get?"][i % 3]}\nA: ${["Annual plans can be refunded within 30 days.", "A director must approve claims over $500.", "Fifteen days, accruing from the start date."][i % 3]}` : d.strategy === "rows" ? `Product: ${["Personal loan", "Line of credit", "Mortgage"][i % 3]} | Band: > $250k | Fee: 0.${5 + i}%` : `${["1. Purpose", "2. Scope", "3. Eligibility", "4. Entitlement"][i % 4]} · ${d.strategy === "headers" ? "[Context: Parental leave policy, section " + ((i % 4) + 1) + "] " : ""}This policy applies to all employees, contractors and directors. Where local legislation sets a higher standard, the higher standard applies. (${d.size} tokens, overlap ${d.overlap})`)), 700) }}>
              Preview chunks
            </Button>
            {chunkPreview && (
              <ol className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border p-2">
                {chunkPreview.map((c, i) => (
                  <li key={i} className="rounded bg-muted/40 px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"><span className="mr-2 text-muted-foreground">#{i + 1}</span>{c}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Include and exclude rules</Label>
              {preview && <span className="text-xs tabular-nums text-muted-foreground">{matched} of {previewCount} preview items match</span>}
            </div>
            <p className="text-xs text-muted-foreground">Include rules are OR'd; exclude rules win.</p>
            <div className="space-y-2">
              {d.rules.map((r, i) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2">
                  <Select value={r.kind} onValueChange={(v) => set("rules", d.rules.map((x, j) => (j === i ? { ...x, kind: v as Rule["kind"] } : x)))}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="include">Include</SelectItem><SelectItem value="exclude">Exclude</SelectItem></SelectContent>
                  </Select>
                  <Select value={r.field} onValueChange={(v) => set("rules", d.rules.map((x, j) => (j === i ? { ...x, field: v as Rule["field"] } : x)))}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{ruleFields.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="h-8 min-w-[160px] flex-1 font-mono text-xs" value={r.value} placeholder={r.field === "path" ? "**/Archive/**" : r.field === "mime" ? "application/zip" : r.field === "sizeUnder" ? "50 MB" : ""} onChange={(e) => set("rules", d.rules.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => set("rules", d.rules.filter((_, j) => j !== i))} aria-label="Remove rule"><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("rules", [...d.rules, { id: `r${Date.now()}`, kind: "exclude", field: "path", value: "" }])}><Plus className="size-3.5" /> Add rule</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Metadata mapping</Label>
            <p className="text-xs text-muted-foreground">Key ← source field. Static values are allowed, e.g. locale = en.</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>From</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {d.mapping.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell><Input className="h-8 font-mono text-xs" value={m.key} placeholder="department" list="meta-keys" onChange={(e) => set("mapping", d.mapping.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} /></TableCell>
                      <TableCell>
                        <Select value={m.from} onValueChange={(v) => set("mapping", d.mapping.map((x, j) => (j === i ? { ...x, from: v } : x)))}>
                          <SelectTrigger className="h-8 w-full min-w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static:en">Static value: en</SelectItem>
                            <SelectItem value="static:contract">Static value: contract</SelectItem>
                            {meta?.type === "sharepoint" && <><SelectItem value="field:Dept">SharePoint column: Dept</SelectItem><SelectItem value="field:Owner">SharePoint column: Owner</SelectItem><SelectItem value="field:Effective date">SharePoint column: Effective date</SelectItem></>}
                            {meta?.type === "confluence" && <><SelectItem value="field:Space">Space key</SelectItem><SelectItem value="field:Label">Page label</SelectItem></>}
                            {meta?.type === "github" && <><SelectItem value="field:Path segment 2">Path segment 2</SelectItem><SelectItem value="field:Repo">Repository</SelectItem></>}
                            {(meta?.type === "crawl" || meta?.type === "url") && <><SelectItem value="field:URL path segment 2">URL path segment 2</SelectItem><SelectItem value="field:Page title">Page title</SelectItem></>}
                            {(meta?.type === "file" || meta?.type === "text") && <><SelectItem value="field:Filename prefix">Filename prefix</SelectItem><SelectItem value="field:CSV column">CSV column</SelectItem></>}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="size-8" onClick={() => set("mapping", d.mapping.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="meta-keys">{["department", "locale", "product", "policy_owner", "team", "space", "vendor", "doc_type", "effective"].map((k) => <option key={k} value={k} />)}</datalist>
            <Button variant="outline" size="sm" onClick={() => set("mapping", [...d.mapping, { key: "", from: "static:en" }])}><Plus className="size-3.5" /> Add mapping</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tags applied to every item</Label>
              <TagInput value={d.tags} onChange={(v) => set("tags", v)} suggestions={["policy", "hr", "engineering", "pricing", "contract", "faq"]} placeholder="policy, hr" />
            </div>
            <div className="space-y-1.5">
              <Label>Title from</Label>
              <Select value={d.titleFrom} onValueChange={(v) => set("titleFrom", v as WizardDraft["titleFrom"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="source">Source title</SelectItem><SelectItem value="heading">First heading</SelectItem><SelectItem value="filename">Filename</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Collection</Label>
              <Input value={d.collection} onChange={(e) => set("collection", e.target.value)} placeholder="HR, Lending, Engineering…" list="collections" />
              <datalist id="collections">{Array.from(new Set(sources.map((s) => s.collection))).map((c) => <option key={c} value={c} />)}</datalist>
              <p className="text-xs text-muted-foreground">The department boundary a knowledge base can be limited to.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Sensitivity</Label>
              <Select value={d.sensitivity} onValueChange={(v) => set("sensitivity", v as Sensitivity)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="confidential">Confidential</SelectItem><SelectItem value="restricted">Restricted (never leaves through a model call unredacted)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {step === 5 && meta && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Permissions</Label>
            <RadioGroup value={d.permissions} onValueChange={(v) => set("permissions", v as WizardDraft["permissions"])} className="grid gap-2">
              {meta.supportsInherit && (
                <label htmlFor="perm-inherit" className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.permissions === "inherit" && "border-primary bg-primary/5")}>
                  <RadioGroupItem value="inherit" id="perm-inherit" className="mt-0.5" />
                  <div><div className="text-sm font-medium">Inherit from {meta.short}</div><p className="text-xs text-muted-foreground">Each item keeps its own permissions, mapped to directory users and groups. Groups sync at sign-in, so a person sees exactly what they can open at the source.</p></div>
                </label>
              )}
              <label htmlFor="perm-ws" className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.permissions === "workspace" && "border-primary bg-primary/5")}>
                <RadioGroupItem value="workspace" id="perm-ws" className="mt-0.5" />
                <div><div className="text-sm font-medium">Workspace-wide</div><p className="text-xs text-muted-foreground">Every member, API key and MCP token that can query a knowledge base sees these items.</p></div>
              </label>
              <label htmlFor="perm-sel" className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", d.permissions === "selected" && "border-primary bg-primary/5")}>
                <RadioGroupItem value="selected" id="perm-sel" className="mt-0.5" />
                <div className="min-w-0 flex-1"><div className="text-sm font-medium">Selected members and groups</div>
                  {d.permissions === "selected" && <div className="mt-2"><TagInput value={d.principals} onChange={(v) => set("principals", v)} suggestions={["group:HR", "group:Engineering", "group:Lending", "group:Legal", "user:priya@northwind.example"]} placeholder="group:Legal, user:…" /></div>}
                </div>
              </label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Refresh schedule</Label>
            <RadioGroup value={d.schedule.kind} onValueChange={(v) => set("schedule", v === "manual" ? { kind: "manual" } : v === "daily" ? { kind: "daily", time: "02:00" } : v === "weekly" ? { kind: "weekly", day: "Mon", time: "03:00" } : v === "monthly" ? { kind: "monthly", day: 1, time: "03:00" } : { kind: "webhook", safetyNetDaily: true })} className="flex flex-wrap gap-2">
              {(["manual", "daily", "weekly", "monthly", "webhook"] as const).map((k) => (
                <label key={k} htmlFor={`sch-${k}`} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm", d.schedule.kind === k && "border-primary bg-primary/5", k === "webhook" && !meta.supportsWebhook && "opacity-50")}>
                  <RadioGroupItem value={k} id={`sch-${k}`} disabled={k === "webhook" && !meta.supportsWebhook} /> <span className="capitalize">{k === "webhook" ? "Webhook triggered" : k}</span>
                </label>
              ))}
            </RadioGroup>
            {d.schedule.kind === "daily" && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">At</span><Input type="time" className="h-8 w-32" value={d.schedule.time} onChange={(e) => set("schedule", { kind: "daily", time: e.target.value })} /></div>}
            {d.schedule.kind === "weekly" && <div className="flex flex-wrap items-center gap-2 text-sm"><Select value={d.schedule.day} onValueChange={(v) => set("schedule", { kind: "weekly", day: v, time: (d.schedule as { time: string }).time })}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><Input type="time" className="h-8 w-32" value={d.schedule.time} onChange={(e) => set("schedule", { kind: "weekly", day: (d.schedule as { day: string }).day, time: e.target.value })} /></div>}
            {d.schedule.kind === "monthly" && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Day</span><Input type="number" min={1} max={28} className="h-8 w-20" value={d.schedule.day} onChange={(e) => set("schedule", { kind: "monthly", day: Number(e.target.value), time: (d.schedule as { time: string }).time })} /><Input type="time" className="h-8 w-32" value={d.schedule.time} onChange={(e) => set("schedule", { kind: "monthly", day: (d.schedule as { day: number }).day, time: e.target.value })} /></div>}
            {d.schedule.kind === "webhook" && (
              <div className="space-y-2 rounded-md border p-3">
                <CopyableField label="Webhook URL" value={`https://api.docs-ai.example/v1/hooks/src/${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "new-source"}`} />
                <CopyableField label="Secret" value="whsec_4f9a1c2e7b3d5e6f8a9b0c1d2e3f4a5b" masked />
                <div className="flex items-center justify-between text-sm"><span>Also run daily as a safety net</span><Switch checked={d.schedule.safetyNetDaily} onCheckedChange={(v) => set("schedule", { kind: "webhook", safetyNetDaily: v })} /></div>
              </div>
            )}
            {meta.supportsWebhook && <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Subscribe to change notifications from {meta.short}</span><Switch checked={d.subscribe} onCheckedChange={(v) => set("subscribe", v)} /></div>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Deleted at source</Label>
              <Select value={d.deletedAtSource} onValueChange={(v) => set("deletedAtSource", v as WizardDraft["deletedAtSource"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="remove">Remove from index</SelectItem><SelectItem value="keep_stale">Keep and mark stale</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stale after (days)</Label>
              <Input type="number" min={1} value={d.staleAfter} onChange={(e) => set("staleAfter", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Past this, items are flagged stale and go to the curation queue.</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Notify on failure (recipients in Settings → Notifications)</span><Switch checked={d.notify} onCheckedChange={(v) => set("notify", v)} /></div>
        </div>
      )}

      {step === 6 && meta && (
        <div className="space-y-4">
          {quotaExceeded && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Not enough storage</AlertTitle>
              <AlertDescription>The preview totals {bytes(preview!.reduce((n, p) => n + p.size, 0))}; 5.8 GB remains. Free space in Storage or narrow the scope.</AlertDescription>
            </Alert>
          )}
          {[
            { title: "Type", step: 1, rows: [["Type", meta.label]] },
            { title: "Connection and scope", step: 2, rows: [["Name", d.name], ["Connection", integration?.connectedAs ?? "—"], ["Scope", d.type === "file" ? `${d.files.length + d.libraryFileIds.length} files` : d.type === "url" ? `${d.urls.split("\n").filter(Boolean).length} URLs` : d.type === "crawl" ? `${d.startUrl} · depth ${d.depth} · ${d.maxPages} pages` : d.type === "text" ? `${d.text.split(/\s+/).filter(Boolean).length} words` : `${d.scope.length} ${meta.scopeLabel.toLowerCase()} · about ${scopeCount.toLocaleString()} items`]] },
            { title: "Parsing and chunking", step: 3, rows: [["Parsing", [d.ocr && "OCR", d.tables && "tables", d.vision && "vision", d.removeHtml && "remove HTML"].filter(Boolean).join(", ") || "defaults"], ["Chunking", `${strategyInfo.find((s) => s.value === d.strategy)?.label} · ${d.size} / ${d.overlap}`]] },
            { title: "Rules and metadata", step: 4, rows: [["Rules", d.rules.filter((r) => r.value).map((r) => `${r.kind} ${r.field} ${r.value}`).join("; ") || "none"], ["Metadata", d.mapping.filter((m) => m.key).map((m) => `${m.key} ← ${m.from.replace("static:", "").replace("field:", "")}`).join(", ") || "none"], ["Tags", d.tags.join(", ") || "none"], ["Collection", d.collection || "General"], ["Sensitivity", d.sensitivity]] },
            { title: "Permissions and schedule", step: 5, rows: [["Permissions", d.permissions === "inherit" ? `Inherit from ${meta.short}` : d.permissions === "workspace" ? "Workspace-wide" : d.principals.join(", ")], ["Schedule", scheduleLabel(d.schedule)], ["Deleted at source", d.deletedAtSource === "remove" ? "Remove from index" : "Keep and mark stale"], ["Stale after", `${d.staleAfter} days`]] },
          ].map((s) => (
            <Section key={s.title} title={s.title} actions={<Button variant="ghost" size="sm" className="h-7" onClick={() => setStep(s.step)}>Edit</Button>} bodyClassName="px-4 py-1">
              {s.rows.map(([k, v]) => <FieldRow key={k} label={k} value={v} wrap />)}
            </Section>
          ))}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="attach" checked={d.kbIds.length > 0} onCheckedChange={(v) => set("kbIds", v ? [kbs[0]?.id].filter(Boolean) : [])} />
              <Label htmlFor="attach">Attach to knowledge base</Label>
            </div>
            {d.kbIds.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-6">
                {kbs.map((k) => (
                  <label key={k.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs", d.kbIds.includes(k.id) && "border-primary bg-primary/5")}>
                    <Checkbox checked={d.kbIds.includes(k.id)} onCheckedChange={(v) => set("kbIds", v ? [...d.kbIds, k.id] : d.kbIds.filter((x) => x !== k.id))} className="size-3.5" /> {k.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  const footer = (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 border-t bg-background px-4 py-3", mode === "page" && "sticky bottom-0")}>
      <div>{step > 1 && <Button variant="ghost" size="sm" onClick={saveDraft}>Save as draft</Button>}</div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        {step > 1 && <Button variant="outline" onClick={() => { setError(null); setStep(step - 1) }}>Back</Button>}
        {step < 6 ? (
          <Button onClick={next} disabled={step === 1 && !d.type}>Next</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => finish(false)} disabled={quotaExceeded}>Create without syncing</Button>
            <Button onClick={() => finish(true)} disabled={quotaExceeded}>Create and sync now</Button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn("flex min-h-0 flex-col", mode === "page" ? "" : "h-full")}>
      <div className={cn("flex min-h-0 flex-1", mode === "page" ? "gap-6" : "flex-col")}>
        {mode === "page" ? (
          <>
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-4 space-y-3">
                <Stepper steps={STEPS} current={step} orientation="vertical" onStepClick={(s) => s < step && setStep(s)} />
                {meta && (
                  <div className="rounded-md border p-3 text-xs text-muted-foreground">
                    <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><meta.icon className="size-3.5" /> {meta.label}</div>
                    Change detection: {meta.changeDetection}.
                  </div>
                )}
              </div>
            </aside>
            <div className="min-w-0 flex-1 space-y-4">
              <Stepper steps={STEPS} current={step} onStepClick={(s) => s < step && setStep(s)} className="lg:hidden" />
              <div className="rounded-lg border bg-card">
                <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">{STEPS[step - 1]}</h2></div>
                <div className="p-4">{stepBody}</div>
                {footer}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <h2 className="mb-2 text-base font-semibold">Add source</h2>
              <Stepper steps={STEPS} current={step} onStepClick={(s) => s < step && setStep(s)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{stepBody}</div>
            {footer}
          </>
        )}
      </div>

      <Dialog open={!!connectFor} onOpenChange={(o) => !o && setConnectFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {meta?.label}</DialogTitle>
            <DialogDescription>Connects for the whole workspace. One connection serves every source of this type.</DialogDescription>
          </DialogHeader>
          {meta?.type === "sharepoint" ? (
            <div className="space-y-3 text-sm">
              <RadioGroup defaultValue="cert" className="grid gap-2">
                <label className="flex items-start gap-3 rounded-md border p-3"><RadioGroupItem value="cert" className="mt-0.5" /><div><div className="font-medium">App-only certificate</div><p className="text-xs text-muted-foreground">Upload the certificate; a tenant admin grants Sites.Read.All once.</p></div></label>
                <label className="flex items-start gap-3 rounded-md border p-3"><RadioGroupItem value="delegated" className="mt-0.5" /><div><div className="font-medium">Delegated (sign in as a user)</div><p className="text-xs text-muted-foreground">Sees only what that user can see.</p></div></label>
              </RadioGroup>
              <Input type="file" accept=".pfx,.pem" />
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><ExternalLink className="size-3" /> Tenant admin consent link is shown after the certificate uploads.</p>
            </div>
          ) : meta?.integrationType && integrations.find((i) => i.type === meta.integrationType)?.authMethod === "api_key" ? (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Subdomain</Label><Input placeholder="northwind" /></div>
              <div className="space-y-1.5"><Label>API token</Label><Input type="password" placeholder="••••••••••••" /></div>
              <p className="text-xs text-muted-foreground">Stored as a workspace secret.</p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p>A popup opens to sign in with {meta?.label}. If the popup is blocked, use the link below.</p>
              <CopyableField value={`https://auth.docs-ai.example/connect/${meta?.integrationType}?ws=northwind`} />
              <p className="text-xs text-muted-foreground">Docs AI asks for read access to the scope you pick in the next step. Tokens are held by the connection, never by a source.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectFor(null)}>Cancel</Button>
            <Button onClick={doConnect} disabled={connecting}>{connecting && <Loader2 className="size-4 animate-spin" />} {connecting ? "Testing connection…" : "Connect"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose from library</DialogTitle>
            <DialogDescription>Files already in the workspace. A file can be used by several sources.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <ul className="divide-y">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <Checkbox id={`lib-${f.id}`} checked={d.libraryFileIds.includes(f.id)} onCheckedChange={(v) => set("libraryFileIds", v ? [...d.libraryFileIds, f.id] : d.libraryFileIds.filter((x) => x !== f.id))} />
                  <label htmlFor={`lib-${f.id}`} className="flex-1 cursor-pointer truncate">{f.name}</label>
                  <span className="text-xs text-muted-foreground">{bytes(f.sizeBytes)}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter><Button onClick={() => setLibraryOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
