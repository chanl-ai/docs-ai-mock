"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Globe, KeyRound, Loader2, Plug, Upload, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { SelectableCard, SelectableCardGroup } from "@/components/ui/selectable-card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ErrorState, FormSkeleton } from "@/components/shared/states"
import { FileDropzone, useUploadRunner, type UploadRow } from "@/components/files/file-dropzone"
import { AddSourceWizard } from "@/components/sources/add-source-wizard"
import { ClientsGrid } from "@/components/connect/clients-grid"
import { CreateTokenDialog } from "@/components/connect/create-token-dialog"
import { CopyableField } from "@/components/shared/copy"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { findAnswer } from "@/lib/mock/answer"
import { slugify } from "@/lib/format"
import type { PlaygroundAnswer, Source } from "@/lib/mock/types"

const TOTAL = 4
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SUGGESTED = ["How much parental leave top-up do we offer in Ontario?", "What is the remote work allowance?", "What is the refund window for annual plans?"]
const TITLES = ["Name your workspace", "Add a first source", "Ask a question", "Connect an AI client"]
const DESCRIPTIONS = [
  "A workspace holds your sources, knowledge bases, tools and team.",
  "Optional. Content you add here becomes a knowledge base you can ask straight away.",
  "Optional. Try the new knowledge base with one question.",
  "Optional. Point Claude, Cursor or another MCP client at the workspace.",
]

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid"
type SourceChoice = "file" | "url" | "app"

export function OnboardingWizard() {
  const router = useRouter()
  const pageState = usePageState()
  const hydrated = useMock((s) => s.hydrated)
  const workspaces = useMock((s) => s.workspaces)
  const runs = useMock((s) => s.runs)
  const kbs = useMock((s) => s.kbs)
  const createWorkspace = useMock((s) => s.createWorkspace)
  const createSource = useMock((s) => s.createSource)
  const createKb = useMock((s) => s.createKb)
  const completeOnboarding = useMock((s) => s.completeOnboarding)

  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // step 1
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle")
  const [created, setCreated] = useState<{ id: string; slug: string; name: string } | null>(null)

  // step 2
  const [choice, setChoice] = useState<SourceChoice | null>(null)
  const [rows, setRows] = useState<UploadRow[]>([])
  const [url, setUrl] = useState("")
  const [appOpen, setAppOpen] = useState(false)
  const [appSource, setAppSource] = useState<Source | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [kbId, setKbId] = useState<string | null>(null)

  // step 3
  const [question, setQuestion] = useState("")
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<PlaygroundAnswer | null>(null)

  // step 4
  const [tokenOpen, setTokenOpen] = useState(false)
  const [tokenSecret, setTokenSecret] = useState<string | null>(null)

  useUploadRunner(rows, setRows, choice === "file" && !sourceId)

  const takenBy = (s: string) => workspaces.some((w) => w.slug === s && w.id !== created?.id)

  // Debounced availability check, matching POST /v1/workspaces/check-slug.
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (created) return
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (!slug) return setSlugStatus("idle")
    if (slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug)) return setSlugStatus("invalid")
    setSlugStatus("checking")
    checkTimer.current = setTimeout(() => setSlugStatus(takenBy(slug) ? "taken" : "available"), 500)
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current) }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const onName = (v: string) => {
    setName(v)
    if (!slugEdited && !created) setSlug(slugify(v).slice(0, 40))
  }

  const run = sourceId ? runs.find((r) => r.sourceId === sourceId && r.status === "running") : undefined
  const lastRun = sourceId ? runs.find((r) => r.sourceId === sourceId) : undefined
  const runFailed = !run && lastRun && (lastRun.status === "partial" || lastRun.status === "failed")
  const kb = kbId ? kbs.find((k) => k.id === kbId) : undefined
  const uploadsDone = rows.filter((r) => r.status === "done").length
  const uploadsBusy = rows.some((r) => r.status === "uploading" || r.status === "queued")

  const finishSourceStep = (src: Source) => {
    const wsName = created?.name ?? "Workspace"
    const newKb = createKb({ name: `${wsName} knowledge`, description: "Everything the workspace knows", color: "teal", sourceIds: [src.id], preset: "balanced" })
    setSourceId(src.id)
    setKbId(newKb.id)
    toast.success("Source added, indexing started", { description: `${src.name} → ${newKb.name}` })
  }

  const createFirstSource = () => {
    if (choice === "file") {
      if (!uploadsDone) return setError(uploadsBusy ? "Wait for the uploads to finish" : "Add at least one file, or skip this step")
      finishSourceStep(createSource({ type: "file", name: "Uploaded files", scopeSummary: `${uploadsDone} files`, itemsPending: uploadsDone }, { sync: true }))
    } else if (choice === "url") {
      let host = ""
      try {
        const u = new URL(url.trim())
        if (!/^https?:$/.test(u.protocol)) throw new Error()
        host = u.hostname
      } catch {
        return setError("Enter a full URL starting with https://")
      }
      finishSourceStep(createSource({ type: "url", name: host, scopeSummary: url.trim(), config: { url: url.trim() } }, { sync: true }))
    } else if (choice === "app") {
      if (!appSource) return setError("Connect an app first, or skip this step")
      finishSourceStep(appSource)
    }
    setError(null)
  }

  const next = () => {
    setError(null)
    if (step === 1) {
      if (name.trim().length < 2 || name.trim().length > 60) return setError("Workspace name is 2 to 60 characters")
      if (!created) {
        if (slugStatus === "checking") return setError("Still checking the address")
        if (slugStatus === "invalid" || slug.length < 3) return setError("Address is 3 to 40 characters: lowercase letters, numbers and hyphens")
        if (takenBy(slug)) return setSlugStatus("taken")
        const ws = createWorkspace(name.trim(), slug)
        setCreated({ id: ws.id, slug: ws.slug, name: ws.name })
        toast.success("Workspace created", { description: ws.name })
      }
      return setStep(2)
    }
    if (step === 2) {
      if (choice && !sourceId) return createFirstSource()
      return setStep(3)
    }
    if (step === 3) return setStep(4)
    finish()
  }

  const back = () => { setError(null); if (step > 1) setStep(step - 1) }
  const skip = () => { setError(null); if (step < TOTAL) setStep(step + 1); else finish() }

  const finish = () => {
    completeOnboarding()
    router.push(`/w/${created?.slug ?? "northwind"}`)
  }

  const ask = (q = question) => {
    if (!q.trim()) return
    setQuestion(q)
    setAsking(true)
    setAnswer(null)
    setTimeout(() => {
      setAnswer(findAnswer(q, kb))
      setAsking(false)
    }, 900)
  }

  // Enter continues and Escape goes back, except while typing in a textarea or inside a dialog.
  const nextRef = useRef(next)
  const backRef = useRef(back)
  nextRef.current = next
  backRef.current = back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (document.querySelector("[role=dialog]")) return
      if (t?.tagName === "TEXTAREA" || t?.getAttribute("role") === "button" || t?.tagName === "BUTTON") return
      if (e.key === "Enter") { e.preventDefault(); nextRef.current() }
      if (e.key === "Escape") backRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!hydrated || pageState === "loading") {
    return <Card><CardContent className="pt-6"><FormSkeleton fields={3} /></CardContent></Card>
  }
  if (pageState === "error") {
    return <ErrorState title="Setup did not load" message="The workspace service did not respond. Nothing was created; try again." onRetry={() => window.location.assign("/onboarding")} />
  }

  const continueLabel = step === TOTAL ? "Finish" : step === 2 && choice && !sourceId ? "Add source" : "Continue"

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step} of {TOTAL}</span>
          <span>{TITLES[step - 1]}</span>
        </div>
        <Progress value={(step / TOTAL) * 100} aria-label={`Step ${step} of ${TOTAL}`} />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>{TITLES[step - 1]}</CardTitle>
          <CardDescription>{DESCRIPTIONS[step - 1]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input id="ws-name" value={name} onChange={(e) => onName(e.target.value)} placeholder="Acme Support" autoFocus maxLength={60} />
                <p className="text-xs text-muted-foreground">2 to 60 characters. Usually your company or team.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-slug">Address</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex min-w-0 grow basis-60 items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50">
                    <span className="shrink-0 border-r bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">docs-ai.example/w/</span>
                    <input
                      id="ws-slug"
                      value={slug}
                      disabled={!!created}
                      onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40)) }}
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-xs outline-none disabled:opacity-60"
                      aria-invalid={slugStatus === "taken" || slugStatus === "invalid"}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-9" disabled={!!created || !name.trim()} onClick={() => { setSlugEdited(false); setSlug(slugify(name).slice(0, 40)) }}>
                    <Wand2 className="size-3.5" /> Auto-generate
                  </Button>
                </div>
                <div className="min-h-5 text-xs">
                  {created && <span className="text-muted-foreground">Workspace created. You can rename it later in Settings; the address stays.</span>}
                  {!created && slugStatus === "checking" && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Checking…</span>}
                  {!created && slugStatus === "available" && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3" /> Available</span>}
                  {!created && slugStatus === "taken" && (
                    <span className="flex flex-wrap items-center gap-1 text-destructive">
                      <AlertTriangle className="size-3" /> Taken — try
                      <button type="button" className="font-mono underline underline-offset-2" onClick={() => { setSlugEdited(true); setSlug(`${slug}-2`) }}>{slug}-2</button>
                    </span>
                  )}
                  {!created && slugStatus === "invalid" && <span className="text-destructive">3 to 40 characters: lowercase letters, numbers and single hyphens.</span>}
                </div>
              </div>
            </>
          )}

          {step === 2 && !sourceId && (
            <>
              <SelectableCardGroup columns={1}>
                <SelectableCard selected={choice === "file"} onSelect={() => setChoice("file")} icon={<Upload className="size-5" />} title="Upload files" description="PDF, Word, Excel, PowerPoint, Markdown and more." />
                <SelectableCard selected={choice === "url"} onSelect={() => setChoice("url")} icon={<Globe className="size-5" />} title="Paste a website URL" description="We read the page and pages it links to on the same site." />
                <SelectableCard selected={choice === "app"} onSelect={() => { setChoice("app"); if (!appSource) setAppOpen(true) }} icon={<Plug className="size-5" />} title="Connect an app" description={appSource ? `Connected: ${appSource.name}` : "SharePoint, Google Drive, Confluence, Notion and others."} />
              </SelectableCardGroup>
              {choice === "file" && <FileDropzone rows={rows} onChange={setRows} compact />}
              {choice === "url" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ob-url">Website URL</Label>
                  <Input id="ob-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://help.example.com" className="font-mono text-xs" />
                </div>
              )}
              {choice === "app" && appSource && <Button variant="outline" size="sm" onClick={() => setAppOpen(true)}>Change app</Button>}
            </>
          )}

          {step === 2 && sourceId && (
            <div className="space-y-3">
              {run?.progress ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin text-muted-foreground" /> Indexing {run.progress.done} of {run.progress.total} items</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round((run.progress.done / run.progress.total) * 100)}%</span>
                  </div>
                  <Progress value={(run.progress.done / run.progress.total) * 100} />
                  <p className="text-xs text-muted-foreground">Indexing runs in the background. You can continue now.</p>
                </>
              ) : runFailed ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Some items did not index</AlertTitle>
                  <AlertDescription>{lastRun?.errors[0]?.message ?? "The sync ended with errors."} The source stays in Sources where you can retry. You can continue.</AlertDescription>
                </Alert>
              ) : (
                <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-600" /> Indexed. {kb?.name} is ready to answer.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {!kb && <p className="text-xs text-muted-foreground">No source was added, so this answers from the sample content.</p>}
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder={run?.progress ? `Indexing ${run.progress.done} of ${run.progress.total} items` : "Ask anything your documents cover"} disabled={!!run} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask() } }} aria-label="Question" />
              <div className="flex flex-wrap items-center gap-2">
                {SUGGESTED.map((q) => (
                  <Button key={q} type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs" disabled={!!run || asking} onClick={() => ask(q)}>{q}</Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => ask()} disabled={!!run || asking || !question.trim()}>{asking && <Loader2 className="size-4 animate-spin" />} Ask</Button>
                {run?.progress && <span className="text-xs text-muted-foreground">Indexing {run.progress.done} of {run.progress.total} items</span>}
              </div>
              {answer && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  {answer.noAnswer ? (
                    <p className="text-sm text-muted-foreground">No document answers that confidently. Try a question your files cover, or add more content later.</p>
                  ) : (
                    <>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{answer.answer}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {answer.citations.map((c) => <Badge key={c.n} variant="outline" className="max-w-full truncate font-normal">[{c.n}] {c.title} · {c.section} · {c.version}</Badge>)}
                      </div>
                      {answer.followed && <p className="text-xs text-muted-foreground">Followed: {answer.followed}</p>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Pick a client for its setup steps, or create a token to paste in yourself.</p>
                <Button variant="outline" size="sm" onClick={() => setTokenOpen(true)}><KeyRound className="size-3.5" /> Create token</Button>
              </div>
              {tokenSecret && <CopyableField label="Your new token (copy it now; it is not shown again after setup)" value={tokenSecret} />}
              <ClientsGrid compact slug={created?.slug} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-2 border-t py-4">
          <Button variant="ghost" onClick={back} disabled={step === 1}>Back</Button>
          <div className="flex flex-wrap gap-2">
            {step > 1 && !(step === 2 && sourceId) && <Button variant="outline" onClick={skip}>{step === TOTAL ? "Skip and finish" : "Skip"}</Button>}
            <Button onClick={next} disabled={step === 1 && !created && slugStatus === "checking"}>{continueLabel}</Button>
          </div>
        </CardFooter>
      </Card>
      <p className="text-center text-xs text-muted-foreground">Enter continues · Escape goes back</p>

      <Sheet open={appOpen} onOpenChange={setAppOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Connect an app</SheetTitle>
            <SheetDescription>Pick an app and choose what to read</SheetDescription>
          </SheetHeader>
          <AddSourceWizard mode="sheet" onDone={(src) => { if (src) { setAppSource(src); setChoice("app") } setAppOpen(false) }} />
        </SheetContent>
      </Sheet>
      <CreateTokenDialog open={tokenOpen} onOpenChange={setTokenOpen} defaults={{ name: "First client" }} onCreated={(s) => setTokenSecret(s)} />
    </div>
  )
}
