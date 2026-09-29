"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ExternalLink, MinusCircle, FileText, Pin, RotateCcw, AlertTriangle, Scale } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CodeBlock } from "@/components/shared/code-sample"
import { CopyButton } from "@/components/shared/copy"
import { ms } from "@/lib/format"
import type { Citation, PlaygroundAnswer, RetrievalSettings } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

/** Renders answer text with [n] markers turned into citation popovers. */
export function CitedText({ text, citations, base, kbId, className }: { text: string; citations: Citation[]; base: string; kbId?: string; className?: string }) {
  const parts = text.split(/(\[\^?\d+\])/g)
  return (
    <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}>
      {parts.map((p, i) => {
        const m = p.match(/^\[\^?(\d+)\]$/)
        if (!m) return <span key={i}>{p}</span>
        const c = citations.find((x) => x.n === Number(m[1]))
        if (!c) return <span key={i}>{p}</span>
        return <CitationMarker key={i} citation={c} base={base} kbId={kbId} />
      })}
    </p>
  )
}

export function CitationMarker({ citation: c, base, kbId }: { citation: Citation; base: string; kbId?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 align-text-top font-mono text-[10px] font-medium hover:bg-accent">
          {c.n}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 text-sm" align="start">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="font-medium leading-snug">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.section}{c.page ? ` · p.${c.page}` : ""} · <span className="font-mono">{c.version}</span></div>
          </div>
        </div>
        <p className="rounded bg-muted/50 p-2 text-xs italic">“{c.snippet}”</p>
        {c.precedenceNote && <p className="text-xs text-muted-foreground">{c.precedenceNote}</p>}
        <div className="flex flex-wrap gap-1.5">
          {kbId && <Button asChild size="sm" variant="outline" className="h-7"><Link href={`${base}/kb/${kbId}/documents?doc=${c.documentId}`}>Open document</Link></Button>}
          {c.url && <Button asChild size="sm" variant="ghost" className="h-7"><a href={c.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open at source</a></Button>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function StructuredValues({ values }: { values: NonNullable<PlaygroundAnswer["structured"]> }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-medium">Structured values</div>
      <table className="w-full text-sm">
        <tbody>
          {values.map((v) => (
            <tr key={v.label} className="border-t first:border-t-0">
              <td className="px-3 py-1.5 text-muted-foreground">{v.label}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{v.value}{v.unit ? <span className="ml-1 text-muted-foreground">{v.unit}</span> : null}</td>
              <td className="hidden px-3 py-1.5 text-right text-xs text-muted-foreground sm:table-cell">{v.from}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function QueryResult({
  result,
  streamed,
  streaming,
  settings,
  kbId,
  base,
  noAnswerMessage,
  onPin,
  onRetry,
  onExclude,
  error,
  compact,
  extraActions,
}: {
  result: PlaygroundAnswer
  streamed?: string
  streaming?: boolean
  settings: RetrievalSettings
  kbId: string
  base: string
  noAnswerMessage: string
  onPin?: () => void
  onRetry?: () => void
  onExclude?: (documentId: string) => void
  error?: string | null
  compact?: boolean
  extraActions?: ReactNode
}) {
  const [showRejected, setShowRejected] = useState(false)
  const chunks = result.chunks.filter((c) => showRejected || !c.rejected)
  const body = {
    query: result.question,
    settings: { searchMode: settings.searchMode, rerank: settings.rerank, chunkLimit: settings.chunkLimit, threshold: settings.threshold, synthesis: settings.synthesis, model: settings.model, temperature: settings.temperature, instructions: settings.instructions, citationStyle: settings.citationStyle },
    filters: { tags: { include: settings.tagsInclude, exclude: settings.tagsExclude, includeUntagged: settings.includeUntagged }, metadata: settings.defaultFilters, sourceIds: settings.scopeSourceIds },
    stream: true,
  }
  const json = JSON.stringify(body, null, 2)
  const curl = `curl -X POST https://api.docs-ai.example/v1/knowledge-bases/${kbId}/query \\\n  -H "Authorization: Bearer $DOCS_AI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Q</span>
        <p className="min-w-0 flex-1 text-sm font-medium">{result.question}</p>
        <div className="flex shrink-0 items-center gap-1">
          {onPin && !streaming && <Button variant="ghost" size="sm" className="h-7" onClick={onPin}><Pin className="size-3.5" /> <span className="hidden sm:inline">Pin to test set</span></Button>}
          {extraActions}
        </div>
      </div>
      {error ? (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>The query did not complete</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              {onRetry && <Button size="sm" variant="outline" className="border-destructive/40 text-foreground" onClick={onRetry}><RotateCcw className="size-3.5" /> Retry</Button>}
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <Tabs defaultValue="answer">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
            <TabsList className="h-8">
              <TabsTrigger value="answer" className="h-7 text-xs">Answer</TabsTrigger>
              <TabsTrigger value="chunks" className="h-7 text-xs">Chunks <span className="ml-1 text-muted-foreground">({result.chunks.filter((c) => !c.rejected).length})</span></TabsTrigger>
              <TabsTrigger value="request" className="h-7 text-xs">Request</TabsTrigger>
            </TabsList>
            {!streaming && (
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-normal tabular-nums">{ms(result.retrievalMs)} retrieval</Badge>
                {result.synthesisMs > 0 && <Badge variant="outline" className="font-normal tabular-nums">{ms(result.synthesisMs)} synthesis</Badge>}
              </div>
            )}
          </div>
          <TabsContent value="answer" className="space-y-3 p-4">
            {result.noAnswer && !streaming ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                  <MinusCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <div className="font-medium">No answer</div>
                    <p className="text-muted-foreground">{noAnswerMessage}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Top rejected chunks, below the {settings.threshold.toFixed(2)} threshold:</p>
                  <ul className="divide-y rounded-md border">
                    {result.chunks.map((c) => (
                      <li key={c.chunkId} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">{c.score.toFixed(2)}</span>
                        <span className="min-w-0 flex-1 truncate">{c.documentTitle} <span className="text-xs text-muted-foreground">· {c.location}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : !settings.synthesis && !streaming ? (
              <p className="text-sm text-muted-foreground">Answer synthesis is off. The Chunks tab holds the retrieved passages.</p>
            ) : (
              <>
                <CitedText text={streaming ? (streamed ?? "") : result.answer} citations={result.citations} base={base} kbId={kbId} />
                {streaming && <span className="inline-block h-4 w-1.5 animate-pulse bg-foreground/70 align-middle" />}
                {!streaming && result.structured && settings.structuredTables && <StructuredValues values={result.structured} />}
                {!streaming && result.followed && (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Scale className="mt-0.5 size-3.5 shrink-0" />
                    <span>Followed: {result.followed}</span>
                  </p>
                )}
                {!streaming && result.citations.length > 0 && !compact && (
                  <ol className="space-y-1 border-t pt-3">
                    {result.citations.map((c) => (
                      <li key={c.n} className="flex items-start gap-2 text-xs">
                        <span className="mt-0.5 rounded border bg-muted px-1 font-mono text-[10px]">{c.n}</span>
                        <span className="min-w-0 text-muted-foreground"><span className="text-foreground">{c.title}</span> · {c.section}{c.page ? ` · p.${c.page}` : ""} · <span className="font-mono">{c.version}</span></span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </TabsContent>
          <TabsContent value="chunks" className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ordered by score after rerank. Threshold {settings.threshold.toFixed(2)}.</p>
              <Toggle size="sm" pressed={showRejected} onPressedChange={setShowRejected} className="h-7 text-xs">Show rejected</Toggle>
            </div>
            <Accordion type="multiple" className="rounded-md border">
              {chunks.map((c, i) => (
                <AccordionItem key={c.chunkId} value={c.chunkId} className={cn("px-3", c.rejected && "opacity-60")}>
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className={cn("w-12 font-mono text-xs tabular-nums", c.rejected ? "text-muted-foreground line-through" : "")}>{c.score.toFixed(2)}</span>
                      <span className="min-w-0 flex-1 truncate text-left">{c.documentTitle}</span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">{c.sourceName} · {c.location} · <span className="font-mono">{c.version}</span></span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p className="text-sm leading-relaxed">{c.text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button asChild size="sm" variant="outline" className="h-7"><Link href={`${base}/kb/${kbId}/documents?doc=${c.documentId}`}>Open document</Link></Button>
                      {onExclude && <Button size="sm" variant="ghost" className="h-7" onClick={() => onExclude(c.documentId)}><MinusCircle className="size-3.5" /> Exclude document from KB</Button>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
              {chunks.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nothing passed the threshold. Toggle “Show rejected” to see what came close.</div>}
            </Accordion>
          </TabsContent>
          <TabsContent value="request" className="space-y-3 p-4">
            <p className="text-xs text-muted-foreground">The exact body that reproduced this result.</p>
            <CodeBlock code={json} />
            <div className="flex flex-wrap gap-2">
              <CopyButton text={curl} label="Copy as cURL" />
              <Button asChild size="sm" variant="ghost"><Link href={`${base}/kb/${kbId}/api`}>Open the query API</Link></Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
