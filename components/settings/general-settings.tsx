"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, ImageUp, Loader2, RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Rows } from "@/components/shared/surface"
import { StatusBadge } from "@/components/shared/status-badge"
import { FormSkeleton, PageStateGate } from "@/components/shared/states"
import { AdminOnly } from "@/components/shared/role-gate"
import { KbDot } from "@/components/knowledge/kb-dot"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { models } from "@/lib/mock/seed"
import { slugify } from "@/lib/format"
import { Field, SettingsSection, SwitchRow, useDraft } from "./settings-kit"

const TIMEZONES = ["America/Toronto", "America/Vancouver", "America/New_York", "America/Chicago", "Europe/London", "Europe/Paris", "Asia/Singapore", "Australia/Sydney", "UTC"]
const EMBEDDING = ["text-embedding-3-large", "text-embedding-3-small", "voyage-3", "cohere-embed-v4"]
const FILE_TYPES = ["pdf", "docx", "xlsx", "pptx", "csv", "txt", "md", "html", "json", "png", "jpg"]
const RESERVED = ["admin", "api", "app", "www", "settings"]

function WorkspaceSection() {
  const router = useRouter()
  const { workspace } = useWs()
  const workspaces = useMock((s) => s.workspaces)
  const updateWorkspace = useMock((s) => s.updateWorkspace)
  const { draft, patch, dirty, reset } = useDraft({ name: workspace.name, slug: workspace.slug, timezone: workspace.timezone })
  const [logo, setLogo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const slugChanged = draft.slug !== workspace.slug
  const taken = slugChanged && (workspaces.some((w) => w.slug === draft.slug && w.id !== workspace.id) || RESERVED.includes(draft.slug))
  const invalid = !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(draft.slug)

  return (
    <SettingsSection
      title="Workspace"
      description="Name, address and time zone."
      dirty={(dirty || !!logo) && !taken && !invalid && !!draft.name.trim()}
      onReset={() => { reset(); setLogo(null) }}
      onSave={() => {
        updateWorkspace({ id: workspace.id, name: draft.name.trim(), slug: draft.slug, timezone: draft.timezone })
        setLogo(null)
        if (slugChanged) router.replace(`/w/${draft.slug}/settings/general`)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ws-name">
          <Input id="ws-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field
          label="URL"
          htmlFor="ws-slug"
          hint={
            !slugChanged ? <span className="font-mono">/w/{draft.slug}</span> : invalid ? <span className="text-destructive">3 to 40 lowercase letters, digits or hyphens</span> : taken ? <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3" /> Taken</span> : <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3" /> Available</span>
          }
        >
          <Input id="ws-slug" className="font-mono text-xs" value={draft.slug} onChange={(e) => patch({ slug: slugify(e.target.value) })} aria-invalid={taken || invalid} />
        </Field>
      </div>
      {slugChanged && !taken && !invalid && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Changing the URL changes MCP and share URLs</AlertTitle>
          <AlertDescription>AI clients configured with the old MCP URL and any shared conversation links stop working until they are updated.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo" hint="PNG or SVG, square, up to 1 MB. Shown in the workspace switcher.">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md border border-dashed bg-muted/40"><ImageUp className="size-4 text-muted-foreground" /></div>
            <input ref={fileRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo(f.name); e.target.value = "" }} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Upload</Button>
            {logo && <span className="truncate font-mono text-xs text-muted-foreground">{logo}</span>}
          </div>
        </Field>
        <Field label="Time zone" hint="Used for schedules, digests and dates in exports.">
          <Select value={draft.timezone} onValueChange={(v) => patch({ timezone: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
    </SettingsSection>
  )
}

function ProvidersSection() {
  const settings = useMock((s) => s.settings)
  const kbs = useMock((s) => s.kbs)
  const updateSettings = useMock((s) => s.updateSettings)
  const refreshKb = useMock((s) => s.refreshKb)
  const { draft, patch, dirty, reset } = useDraft({ defaultChatModel: settings.defaultChatModel, defaultEmbeddingModel: settings.defaultEmbeddingModel })
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, "ok" | string>>({})
  const embeddingChanged = draft.defaultEmbeddingModel !== settings.defaultEmbeddingModel
  const keysDirty = Object.values(keys).some(Boolean)

  const test = (id: string, configured: boolean) => {
    setTesting(id)
    setTimeout(() => {
      setTesting(null)
      setResults((r) => ({ ...r, [id]: keys[id] || configured ? "ok" : "Enter a key first. The provider rejected an empty key (401 Unauthorized)." }))
    }, 900)
  }

  return (
    <SettingsSection
      title="Model providers"
      description="Keys are stored as workspace secrets and never shown again after saving."
      dirty={dirty || keysDirty}
      onReset={() => { reset(); setKeys({}) }}
      onSave={() => {
        updateSettings({
          ...draft,
          providers: settings.providers.map((p) => (keys[p.id] ? { ...p, configured: true, keyRef: p.keyRef ?? `${p.id.toUpperCase()}_API_KEY` } : p)),
        })
        setKeys({})
      }}
    >
      <div className="-mx-4 border-y">
        <Rows>
          {settings.providers.map((p) => (
            <li key={p.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{p.name}</span>
                {p.configured ? <StatusBadge tone="good" icon={CheckCircle2} label="Configured" /> : <Badge variant="outline" className="font-normal">Not configured</Badge>}
                {p.keyRef && <span className="font-mono text-xs text-muted-foreground">{p.keyRef}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="password" className="h-8 min-w-0 flex-1 font-mono text-xs sm:max-w-sm" placeholder={p.configured ? "•••••••••••• (enter a new key to replace)" : "Paste an API key"} value={keys[p.id] ?? ""} onChange={(e) => { setKeys((k) => ({ ...k, [p.id]: e.target.value })); setResults((r) => ({ ...r, [p.id]: "" })) }} aria-label={`${p.name} API key`} autoComplete="off" />
                <Button size="sm" variant="outline" disabled={testing === p.id} onClick={() => test(p.id, p.configured)}>
                  {testing === p.id && <Loader2 className="size-3.5 animate-spin" />} Test
                </Button>
                {results[p.id] === "ok" && <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" /> Key valid</span>}
              </div>
              {results[p.id] && results[p.id] !== "ok" && <p className="text-xs text-destructive">{results[p.id]}</p>}
            </li>
          ))}
        </Rows>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default chat model" hint="Used for synthesis unless a knowledge base picks its own.">
          <Select value={draft.defaultChatModel} onValueChange={(v) => patch({ defaultChatModel: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{models.map((m) => <SelectItem key={m.id} value={m.id}>{m.label} <span className="text-muted-foreground">· {m.provider}</span></SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Default embedding model" hint="Every knowledge base indexes with this model.">
          <Select value={draft.defaultEmbeddingModel} onValueChange={(v) => patch({ defaultEmbeddingModel: v })}>
            <SelectTrigger className="w-full font-mono text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{EMBEDDING.map((m) => <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      {embeddingChanged && (
        <Alert>
          <RefreshCw className="size-4" />
          <AlertTitle>Every knowledge base must be rebuilt</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Vectors from different embedding models cannot be compared. Until each of the {kbs.length} knowledge bases is rebuilt, it keeps answering with the old model.</p>
            <Button size="sm" variant="outline" onClick={() => { updateSettings({ defaultEmbeddingModel: draft.defaultEmbeddingModel }); kbs.forEach((k) => refreshKb(k.id)); toast.success(`Rebuilding ${kbs.length} knowledge bases`, { description: `With ${draft.defaultEmbeddingModel}` }) }}>
              Rebuild all
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </SettingsSection>
  )
}

function KnowledgeDefaultsSection() {
  const settings = useMock((s) => s.settings)
  const updateSettings = useMock((s) => s.updateSettings)
  const { draft, patch, dirty, reset } = useDraft(settings.knowledgeDefaults)
  const numField = (key: keyof typeof draft, label: string, hint?: string) => (
    <Field label={label} htmlFor={`kd-${key}`} hint={hint}>
      <Input id={`kd-${key}`} type="number" className="tabular-nums" value={String(draft[key])} onChange={(e) => patch({ [key]: Number(e.target.value) } as Partial<typeof draft>)} />
    </Field>
  )
  const invalid = draft.overlap >= draft.chunkSize || draft.chunkSize < 64
  return (
    <SettingsSection title="Knowledge defaults" description="Applied to new sources and knowledge bases. Existing ones keep their own settings." dirty={dirty && !invalid} onReset={reset} onSave={() => updateSettings({ knowledgeDefaults: draft })}>
      <div className="grid gap-4 sm:grid-cols-3">
        {numField("chunkSize", "Chunk size (tokens)")}
        {numField("overlap", "Overlap (tokens)")}
        {numField("staleAfterDays", "Stale after (days)")}
      </div>
      {invalid && <p className="text-xs text-destructive">Chunk size must be at least 64 tokens and larger than the overlap.</p>}
      <SwitchRow id="kd-retry" label="Retry failed items automatically" description="Failed items are retried on the next sync, up to three times." checked={draft.retryFailed} onCheckedChange={(v) => patch({ retryFailed: v })} />
      <Field label="Allowed file types">
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-accent">
              <Checkbox checked={draft.allowedTypes.includes(t)} onCheckedChange={(c) => patch({ allowedTypes: c ? [...draft.allowedTypes, t] : draft.allowedTypes.filter((x) => x !== t) })} />
              <span className="font-mono">.{t}</span>
            </label>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {numField("maxFileMb", "Max file size (MB)")}
        {numField("maxDocuments", "Max documents per source")}
      </div>
    </SettingsSection>
  )
}

function ChatSection() {
  const settings = useMock((s) => s.settings)
  const kbs = useMock((s) => s.kbs)
  const updateSettings = useMock((s) => s.updateSettings)
  const { draft, patch, dirty, reset } = useDraft(settings.chat)
  const mode = draft.defaultKbs === "all" ? "all" : draft.defaultKbs === "none" ? "none" : "specific"
  const picked = Array.isArray(draft.defaultKbs) ? draft.defaultKbs : []
  return (
    <SettingsSection title="Chat" description="Defaults for new conversations in the app." dirty={dirty && !!draft.assistantName.trim()} onReset={reset} onSave={() => updateSettings({ chat: draft })}>
      <Field label="Knowledge bases selected in a new conversation">
        <RadioGroup value={mode} onValueChange={(v) => patch({ defaultKbs: v === "specific" ? picked : (v as "all" | "none") })} className="gap-2">
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="all" /> All the member can query</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="none" /> None; the member picks</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="specific" /> Specific knowledge bases</label>
        </RadioGroup>
        {mode === "specific" && (
          <ul className="mt-2 space-y-1.5 border-l pl-4">
            {kbs.map((k) => (
              <li key={k.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={picked.includes(k.id)} onCheckedChange={(c) => patch({ defaultKbs: c ? [...picked, k.id] : picked.filter((x) => x !== k.id) })} />
                  <KbDot color={k.color} /> {k.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <SwitchRow id="chat-tools" label="Tools enabled by default" description="Members can still turn tools off per conversation." checked={draft.toolsByDefault} onCheckedChange={(v) => patch({ toolsByDefault: v })} />
      <Field label="Assistant name" htmlFor="chat-name" hint="Shown in chat and in answers sent over public links.">
        <Input id="chat-name" value={draft.assistantName} onChange={(e) => patch({ assistantName: e.target.value })} className="sm:max-w-sm" />
      </Field>
    </SettingsSection>
  )
}

export function GeneralSettings() {
  const state = usePageState()
  return (
    <AdminOnly>
      <PageStateGate state={state} loading={<FormSkeleton fields={8} />}>
        <WorkspaceSection />
        <ProvidersSection />
        <KnowledgeDefaultsSection />
        <ChatSection />
      </PageStateGate>
    </AdminOnly>
  )
}
