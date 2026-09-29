"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { KeyRound, Play, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Section, FieldRow, Mono } from "@/components/shared/surface"
import { CopyableField } from "@/components/shared/copy"
import { CodeSample, CodeBlock } from "@/components/shared/code-sample"
import { PageStateGate, FormSkeleton } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { findAnswer } from "@/lib/mock/answer"

const API = "https://api.docs-ai.example/v1"

export default function KbApiPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const apiKeys = useMock((s) => s.apiKeys.filter((k) => k.kbIds.includes(kb.id) || k.kbIds.length === 0))
  const createApiKey = useMock((s) => s.createApiKey)
  const [keyId, setKeyId] = useState<string>(apiKeys[0]?.id ?? "")
  const [reveal, setReveal] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [scopes, setScopes] = useState<string[]>(["kb:query"])
  const [expiry, setExpiry] = useState("90")
  const [created, setCreated] = useState<{ secret: string } | null>(null)
  const [trying, setTrying] = useState(false)
  const [tryResult, setTryResult] = useState<string | null>(null)
  const [sessionSecret, setSessionSecret] = useState<Record<string, string>>({})

  const key = apiKeys.find((k) => k.id === keyId)
  const shownKey = key ? (reveal && sessionSecret[key.id] ? sessionSecret[key.id] : key.prefix.replace("…", "••••••••••••••••")) : "$DOCS_AI_API_KEY"
  const r = kb.retrieval
  const samples = useMemo(() => {
    const body = { query: "What is the refund window for annual plans?", settings: { searchMode: r.searchMode, chunkLimit: r.chunkLimit, threshold: r.threshold }, filters: { tags: { include: r.tagsInclude, exclude: r.tagsExclude, includeUntagged: r.includeUntagged }, metadata: r.defaultFilters, sourceIds: [] }, stream: false }
    const json = JSON.stringify(body, null, 2)
    return [
      { id: "curl", label: "cURL", code: `curl -X POST ${API}/knowledge-bases/${kb.id}/query \\\n  -H "Authorization: Bearer ${shownKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'` },
      { id: "ts", label: "TypeScript", code: `import { DocsAI } from "@docs-ai/sdk"\n\nconst client = new DocsAI({ apiKey: "${shownKey}" })\n\nconst result = await client.knowledgeBases.query("${kb.id}", ${json.replace(/\n/g, "\n")})\n\nconsole.log(result.answer)\nfor (const c of result.citations) {\n  console.log(\`[\${c.n}] \${c.title} · \${c.section} · \${c.version}\`)\n}` },
      { id: "py", label: "Python", code: `from docs_ai import DocsAI\n\nclient = DocsAI(api_key="${shownKey}")\n\nresult = client.knowledge_bases.query(\n    "${kb.id}",\n    query="What is the refund window for annual plans?",\n    settings={"search_mode": "${r.searchMode}", "chunk_limit": ${r.chunkLimit}, "threshold": ${r.threshold}},\n)\n\nprint(result.answer)\nfor c in result.citations:\n    print(f"[{c.n}] {c.title} · {c.section} · {c.version}")` },
      { id: "mcp", label: "MCP", code: `// Any MCP client with a token that has knowledge:read reaches this KB as a tool.\n{\n  "mcpServers": {\n    "docs-ai": {\n      "url": "https://mcp.docs-ai.example/w/northwind/mcp",\n      "headers": { "Authorization": "Bearer <MCP_TOKEN>" }\n    }\n  }\n}\n\n// Tool exposed: ${kb.access.mcp.toolName}(query, filters?)` },
    ]
  }, [kb.id, r, shownKey, kb.access.mcp.toolName])

  const tryIt = () => {
    setTrying(true)
    setTryResult(null)
    setTimeout(() => {
      const a = findAnswer("What is the refund window for annual plans?", kb)
      setTryResult(JSON.stringify({ answer: a.answer, citations: a.citations.map((c) => ({ documentId: c.documentId, title: c.title, section: c.section, page: c.page ?? null, version: c.version, snippet: c.snippet })), chunks: a.chunks.filter((c) => !c.rejected).map((c) => ({ chunkId: c.chunkId, documentId: c.documentId, score: c.score, location: c.location, version: c.version })), noAnswer: a.noAnswer, followed: a.followed, timing: { retrievalMs: a.retrievalMs, synthesisMs: a.synthesisMs } }, null, 2))
      setTrying(false)
    }, 900)
  }

  return (
    <PageStateGate state={state} loading={<FormSkeleton />}>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Section title="Endpoint" description="Everything needed to query this knowledge base from code.">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">POST</Badge>
                <CopyableField value={`${API}/knowledge-bases/${kb.id}/query`} className="flex-1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">API key</Label>
                  <Select value={keyId} onValueChange={setKeyId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={apiKeys.length ? "Choose a key" : "Create your first key"} /></SelectTrigger>
                    <SelectContent>
                      {apiKeys.map((k) => <SelectItem key={k.id} value={k.id}>{k.name} <span className="ml-2 font-mono text-xs text-muted-foreground">{k.prefix}</span></SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Toggle size="sm" pressed={reveal} onPressedChange={setReveal} disabled={!key || !sessionSecret[key.id]} aria-label="Reveal key" className="h-9">
                    {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} Reveal
                  </Toggle>
                  <Button variant="outline" onClick={() => setCreateOpen(true)}><KeyRound className="size-4" /> Create key</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Keys are never fetched in full after creation; Reveal works only in the session that created the key.{!admin && " Members can create keys with kb:query only."}</p>
            </div>
          </Section>
          <Section title="Samples" description="Rendered with the selected key and this knowledge base's saved defaults.">
            <CodeSample tabs={samples} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={tryIt} disabled={trying}>{trying ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Try it</Button>
              <span className="text-xs text-muted-foreground">Sends the sample from the browser using your session, not the key.</span>
            </div>
            {tryResult && <div className="mt-3"><CodeBlock code={tryResult} maxHeight={320} /></div>}
          </Section>
          <Section title="Other endpoints" flush>
            <ul className="divide-y text-sm">
              {[
                ["GET", `/knowledge-bases/${kb.id}/documents?q&tag&meta[key]=v`, "List documents"],
                ["GET", `/knowledge-bases/${kb.id}/documents/{id}`, "Get a document with chunks"],
                ["PATCH", `/knowledge-bases/${kb.id}/documents/{id}`, "Update tags and metadata"],
                ["POST", "/sources/{sourceId}/items", "Add to a source (multipart, { url } or { text })"],
                ["DELETE", "/sources/{sourceId}/items/{id}", "Remove an item"],
                ["POST", "/sources/{sourceId}/sync", "Trigger a resync"],
              ].map(([m, p, d]) => (
                <li key={p} className="flex flex-wrap items-center gap-2 px-4 py-2">
                  <Badge variant="outline" className="w-16 justify-center font-mono text-[11px]">{m}</Badge>
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{p}</code>
                  <span className="text-xs text-muted-foreground">{d}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Request" flush bodyClassName="px-4 py-2">
            <Accordion type="multiple" defaultValue={["query", "settings"]}>
              <AccordionItem value="query"><AccordionTrigger className="py-2 text-sm"><Mono>query</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">string, 1 to 2000 chars. Required.</AccordionContent></AccordionItem>
              <AccordionItem value="settings"><AccordionTrigger className="py-2 text-sm"><Mono>settings</Mono></AccordionTrigger><AccordionContent className="space-y-1 text-xs text-muted-foreground">Each optional, overrides the KB default shown in brackets.<div className="pt-1"><FieldRow label="searchMode" value={r.searchMode} mono /><FieldRow label="rerank" value={String(r.rerank)} mono /><FieldRow label="chunkLimit" value={String(r.chunkLimit)} mono /><FieldRow label="threshold" value={String(r.threshold)} mono /><FieldRow label="synthesis" value={String(r.synthesis)} mono /><FieldRow label="model" value={r.model} mono /><FieldRow label="temperature" value={String(r.temperature)} mono /><FieldRow label="citationStyle" value={r.citationStyle} mono /></div></AccordionContent></AccordionItem>
              <AccordionItem value="filters"><AccordionTrigger className="py-2 text-sm"><Mono>filters</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground"><Mono>tags</Mono> {"{ include, exclude, includeUntagged }"} · <Mono>metadata</Mono> [{"{ key, op, value }"}] · <Mono>sourceIds</Mono> []. Callers need the <Mono>filters:override</Mono> scope to replace the KB defaults.</AccordionContent></AccordionItem>
              <AccordionItem value="stream"><AccordionTrigger className="py-2 text-sm"><Mono>stream</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">boolean. When true the response is server-sent events: text, citations, chunks, done.</AccordionContent></AccordionItem>
            </Accordion>
          </Section>
          <Section title="Response" flush bodyClassName="px-4 py-2">
            <Accordion type="multiple" defaultValue={["answer", "citations"]}>
              <AccordionItem value="answer"><AccordionTrigger className="py-2 text-sm"><Mono>answer</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">string or null. Null when synthesis is off or nothing passed the threshold (<Mono>noAnswer</Mono> true).</AccordionContent></AccordionItem>
              <AccordionItem value="citations"><AccordionTrigger className="py-2 text-sm"><Mono>citations[]</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">{"{ documentId, chunkId, title, url, section, page, version, snippet }"}. Version and section are always present so a decision can be traced to the document that was read.</AccordionContent></AccordionItem>
              <AccordionItem value="chunks"><AccordionTrigger className="py-2 text-sm"><Mono>chunks[]</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">{"{ chunkId, documentId, score, text, location, metadata }"}. Omitted when <Mono>includeSourceChunks</Mono> is off.</AccordionContent></AccordionItem>
              <AccordionItem value="structured"><AccordionTrigger className="py-2 text-sm"><Mono>structured[]</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">{"{ label, value, unit, from }"} when the answer came from a table row (fee schedules, limits, eligibility bands).</AccordionContent></AccordionItem>
              <AccordionItem value="followed"><AccordionTrigger className="py-2 text-sm"><Mono>followed</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">Which document the answer followed when a precedence rule applied.</AccordionContent></AccordionItem>
              <AccordionItem value="timing"><AccordionTrigger className="py-2 text-sm"><Mono>timing</Mono></AccordionTrigger><AccordionContent className="text-xs text-muted-foreground">{"{ retrievalMs, synthesisMs }"}</AccordionContent></AccordionItem>
            </Accordion>
          </Section>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCreated(null); setNewName("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{created ? "Key created" : "Create API key"}</DialogTitle>
            <DialogDescription>{created ? "Copy it now; it is shown once." : `Scoped to ${kb.name}. Add scopes only for what the caller does.`}</DialogDescription>
          </DialogHeader>
          {created ? (
            <CopyableField label="API key" value={created.secret} />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="key-name">Name</Label><Input id="key-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="help-widget" autoFocus /></div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                {[["kb:query", "Query this knowledge base"], ["kb:write", "Add and update documents"], ["tools:run", "Run tools"]].map(([s, d]) => (
                  <label key={s} className={`flex items-center gap-2 text-sm ${s === "kb:write" && !admin ? "opacity-50" : ""}`}>
                    <Checkbox checked={scopes.includes(s)} disabled={s === "kb:write" && !admin} onCheckedChange={(v) => setScopes((x) => (v ? [...x, s] : x.filter((y) => y !== s)))} /> <Mono>{s}</Mono> <span className="text-muted-foreground">{d}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Expiry</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="30">30 days</SelectItem><SelectItem value="90">90 days</SelectItem><SelectItem value="365">1 year</SelectItem><SelectItem value="0">Never</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            {created ? (
              <Button onClick={() => setCreateOpen(false)}>I stored it</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button disabled={newName.trim().length < 2 || !scopes.length} onClick={() => { const { key: k, secret } = createApiKey({ name: newName.trim(), scopes, kbIds: [kb.id], expiresInDays: Number(expiry) || undefined }); setSessionSecret((m) => ({ ...m, [k.id]: secret })); setKeyId(k.id); setCreated({ secret }); toast.success("API key created") }}>Create</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStateGate>
  )
}
