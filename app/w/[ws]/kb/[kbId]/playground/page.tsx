"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Send, Loader2, Settings2, Save, RotateCcw, Square, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RetrievalForm } from "@/components/knowledge/retrieval-form"
import { QueryResult } from "@/components/knowledge/query-result"
import { PermissionDenied } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { findAnswer } from "@/lib/mock/answer"
import { suggestedQuestions } from "@/lib/mock/seed/kbs"
import { DRAFT_KEY } from "@/lib/mock/playground-draft"
import type { PlaygroundAnswer, RetrievalSettings } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

interface Turn {
  id: string
  result: PlaygroundAnswer
  streamed: string
  streaming: boolean
  error?: string | null
  settings: RetrievalSettings
}

function PlaygroundInner() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const search = useSearchParams()
  const { base } = useWs()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const sources = useMock((s) => s.sources.filter((x) => kb.sources.some((l) => l.sourceId === x.id)))
  const items = useMock((s) => s.items)
  const updateRetrieval = useMock((s) => s.updateRetrieval)
  const addTestQuestion = useMock((s) => s.addTestQuestion)
  const excludeItem = useMock((s) => s.excludeItem)
  const [draft, setDraft] = useState<RetrievalSettings>(kb.retrieval)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState(search.get("q") ?? "")
  const [railOpen, setRailOpen] = useState(false)
  const [pinFor, setPinFor] = useState<Turn | null>(null)
  const [mustCite, setMustCite] = useState("")
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY(kb.id))
      if (raw) {
        setDraft(JSON.parse(raw))
        sessionStorage.removeItem(DRAFT_KEY(kb.id))
        toast.message("Unsaved retrieval settings loaded as a draft")
      }
    } catch {}
  }, [kb.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }) }, [turns.length, turns[turns.length - 1]?.streamed.length])

  const isDraft = JSON.stringify(draft) !== JSON.stringify(kb.retrieval)
  const metadataKeys = useMemo(() => Array.from(new Set(items.filter((i) => kb.sources.some((l) => l.sourceId === i.sourceId)).flatMap((i) => Object.keys(i.metadata)))), [items, kb.sources])
  const busy = turns.some((t) => t.streaming)
  const failedKb = kb.health === "failed"
  const memberDenied = !admin && kb.access.members.mode === "selected" && !kb.access.members.principals.some((p) => p.includes("priya"))

  const ask = (question: string, forceError = false) => {
    const q = question.trim()
    if (!q || busy) return
    setInput("")
    const id = `t${Date.now()}`
    if (forceError || state === "error") {
      setTurns((t) => [...t, { id, result: { ...findAnswer(q, kb, draft), question: q }, streamed: "", streaming: false, error: "The query service returned 503 after 8 s. Your settings were not changed. Retry now; if it keeps failing, check Home for an outage note.", settings: draft }])
      return
    }
    const result = findAnswer(q, kb, draft)
    setTurns((t) => [...t, { id, result, streamed: "", streaming: true, settings: draft }])
    const text = result.noAnswer || !draft.synthesis ? "" : result.answer
    let i = 0
    const delay = Math.max(250, result.retrievalMs / 2)
    setTimeout(() => {
      if (!text) {
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, streaming: false } : x)))
        return
      }
      timer.current = setInterval(() => {
        i += 4
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, streamed: text.slice(0, i) } : x)))
        if (i >= text.length) {
          if (timer.current) clearInterval(timer.current)
          setTurns((t) => t.map((x) => (x.id === id ? { ...x, streaming: false, streamed: text } : x)))
        }
      }, 18)
    }, delay)
  }

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    setTurns((t) => t.map((x) => (x.streaming ? { ...x, streaming: false, result: { ...x.result, answer: x.streamed } } : x)))
  }

  const rail = (
    <div className="space-y-4">
      <RetrievalForm value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} sources={sources} metadataKeys={metadataKeys} variant="rail" />
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {admin && <Button size="sm" disabled={!isDraft} onClick={() => { updateRetrieval(kb.id, draft); toast.success("Saved as knowledge base defaults") }}><Save className="size-3.5" /> Save as defaults</Button>}
        <Button size="sm" variant="outline" disabled={!isDraft} onClick={() => setDraft(kb.retrieval)}><RotateCcw className="size-3.5" /> Reset to saved</Button>
      </div>
    </div>
  )

  if (memberDenied) return <PermissionDenied requiredRole="a member granted access to this knowledge base" />

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="flex min-h-[60vh] flex-col gap-3">
        {kb.health === "indexing" && (
          <Alert><AlertDescription>Index is refreshing ({kb.indexing?.done} of {kb.indexing?.total}); results may be partial.</AlertDescription></Alert>
        )}
        {failedKb && (
          <Alert variant="destructive"><AlertDescription>The last refresh failed, so results reflect the previous index. <Link href={`${base}/kb/${kb.id}`} className="underline underline-offset-4">See why on Overview</Link>.</AlertDescription></Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Ask a question, see the answer and the exact chunks behind it, and change settings until it is right.</p>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link href={`${base}/kb/${kb.id}/evals`}><ListChecks className="size-3.5" /> Test set</Link></Button>
            <Button variant="outline" size="sm" className="xl:hidden" onClick={() => setRailOpen(true)}>
              <Settings2 className="size-3.5" /> Settings {isDraft && <Badge variant="secondary" className="ml-1 font-normal">Draft</Badge>}
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {turns.length === 0 && (
            <div className="rounded-lg border border-dashed p-6">
              <p className="mb-3 text-sm font-medium">Try one of these, generated from document titles</p>
              <div className="flex flex-wrap gap-2">
                {(suggestedQuestions[kb.id] ?? suggestedQuestions.kb_all).map((q) => (
                  <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border px-3 py-1.5 text-left text-sm hover:bg-accent">{q}</button>
                ))}
                {state === "error" && <button type="button" onClick={() => ask("What is the refund window for annual plans?", true)} className="rounded-full border border-destructive/40 px-3 py-1.5 text-sm text-destructive">Trigger a query error</button>}
              </div>
            </div>
          )}
          {turns.map((t) => (
            <QueryResult
              key={t.id}
              result={t.result}
              streamed={t.streamed}
              streaming={t.streaming}
              settings={t.settings}
              kbId={kb.id}
              base={base}
              noAnswerMessage={t.settings.noAnswerMessage}
              error={t.error}
              onRetry={() => { setTurns((x) => x.filter((y) => y.id !== t.id)); ask(t.result.question) }}
              onPin={() => { setPinFor(t); setMustCite(t.result.citations[0]?.title ?? "") }}
              onExclude={(docId) => { excludeItem(docId); toast.success("Excluded from the index", { description: "The document is removed on the next refresh." }) }}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 -mx-1 rounded-lg border bg-background p-2 shadow-sm">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input) } }}
              placeholder={failedKb ? "Input disabled while the last refresh is failed" : "Ask a question…"}
              disabled={failedKb}
              rows={2}
              className="min-h-[44px] resize-none border-0 shadow-none focus-visible:ring-0"
            />
            {busy ? (
              <Button size="icon" variant="outline" onClick={stop} aria-label="Stop"><Square className="size-4" /></Button>
            ) : (
              <Button size="icon" onClick={() => ask(input)} disabled={!input.trim() || failedKb} aria-label="Send">{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
            )}
          </div>
          <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-muted-foreground">
            <span>Enter to send · Shift+Enter for a new line</span>
            <span className={cn("hidden sm:inline", isDraft && "text-amber-600 dark:text-amber-400")}>{isDraft ? "Using draft settings" : "Using saved settings"} · {draft.searchMode} · {draft.chunkLimit} chunks · ≥ {draft.threshold.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Settings</h2>
            {isDraft && <Badge variant="secondary" className="font-normal">Draft</Badge>}
          </div>
          <ScrollArea className="max-h-[calc(100vh-10rem)]">
            <div className="p-4">{rail}</div>
          </ScrollArea>
        </div>
      </aside>

      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">Settings {isDraft && <Badge variant="secondary" className="font-normal">Draft</Badge>}</SheetTitle>
            <SheetDescription>Overrides for this session until you save them as defaults.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{rail}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pin to the test set</DialogTitle>
            <DialogDescription>Golden questions run against every settings change and score precision and groundedness.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/50 p-3 text-sm">{pinFor?.result.question}</div>
            <div className="space-y-1.5">
              <Label htmlFor="must-cite">Must cite document</Label>
              <Input id="must-cite" value={mustCite} onChange={(e) => setMustCite(e.target.value)} placeholder="refund-policy-2026.pdf" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinFor(null)}>Cancel</Button>
            <Button onClick={() => { if (pinFor) addTestQuestion({ kbId: kb.id, question: pinFor.result.question, mustCite, expected: pinFor.result.answer.slice(0, 80) }); toast.success("Pinned to the test set"); setPinFor(null) }}>Pin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function KbPlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <PlaygroundInner />
    </Suspense>
  )
}
