"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { BookOpenText, Send, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useMock } from "@/lib/mock/store"
import { findAnswer } from "@/lib/mock/answer"
import type { PlaygroundAnswer } from "@/lib/mock/types"
import { EmptyState } from "@/components/shared/states"
import { Lock } from "lucide-react"

interface Turn {
  q: string
  a?: PlaygroundAnswer
  streamed?: string
}

export default function PublicSharePage() {
  const params = useParams<{ slug: string }>()
  const hydrated = useMock((s) => s.hydrated)
  const kb = useMock((s) => s.kbs.find((k) => k.access.publicLink.slug === params.slug))
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns])

  if (!hydrated) return null
  if (!kb || !kb.access.publicLink.enabled) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-lg border bg-card">
          <EmptyState icon={Lock} title="This link is not active" description="The workspace that owns this knowledge base has turned its public link off, or the link was never enabled. Ask whoever sent it for a current link." />
        </div>
      </div>
    )
  }

  const ask = () => {
    const q = input.trim()
    if (!q || busy) return
    setInput("")
    setBusy(true)
    const a = findAnswer(q, kb)
    setTurns((t) => [...t, { q, streamed: "" }])
    const text = a.noAnswer ? kb.retrieval.noAnswerMessage : a.answer
    let i = 0
    const timer = setInterval(() => {
      i += 6
      setTurns((t) => t.map((x, idx) => (idx === t.length - 1 ? { ...x, streamed: text.slice(0, i) } : x)))
      if (i >= text.length) {
        clearInterval(timer)
        setTurns((t) => t.map((x, idx) => (idx === t.length - 1 ? { ...x, a } : x)))
        setBusy(false)
      }
    }, 30)
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpenText className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{kb.name}</div>
          <div className="truncate text-xs text-muted-foreground">Answers come from the published documents. No account needed.</div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
        {turns.length === 0 && (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Ask a question about {kb.name.toLowerCase()}. Answers cite the page they came from.
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{t.q}</div>
            <div className="max-w-[92%] space-y-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap">{t.a ? (t.a.noAnswer ? kb.retrieval.noAnswerMessage : t.a.answer) : t.streamed}{!t.a && <span className="animate-pulse">▍</span>}</p>
              {t.a && !t.a.noAnswer && kb.access.publicLink.showSourceLinks && t.a.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t pt-2">
                  {t.a.citations.map((c) => (
                    <Badge key={c.n} variant="outline" className="gap-1 font-normal">
                      <span className="font-mono text-[10px]">[{c.n}]</span> {c.title}
                      {c.url && <ExternalLink className="size-3" />}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </main>
      <footer className="border-t bg-background p-3">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask() } }} placeholder="Ask a question…" rows={1} className="min-h-10 resize-none" />
          <Button onClick={ask} disabled={busy || !input.trim()} size="icon" aria-label="Send">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted-foreground">Rate limited to {kb.access.publicLink.rateLimit} questions per hour.</p>
      </footer>
    </div>
  )
}
