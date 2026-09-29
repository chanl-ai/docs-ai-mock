"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Loader2, MinusCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Stepper } from "@/components/shared/stepper"
import { Rows, Row } from "@/components/shared/surface"
import { StatusBadge } from "@/components/shared/status-badge"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import type { Tool } from "@/lib/mock/types"

const SAMPLE_SPEC = JSON.stringify(
  {
    openapi: "3.0.3",
    info: { title: "Northwind Core Banking", version: "2.4.0" },
    servers: [{ url: "https://api.northwind.example/v2" }],
    paths: {
      "/accounts": { get: { operationId: "listAccounts", summary: "List accounts", description: "List accounts for a customer id.", tags: ["accounts"] } },
      "/accounts/{id}": { get: { operationId: "getAccount", summary: "Account lookup", description: "Read one account by id with balances.", tags: ["accounts"] } },
      "/transfers": { post: { operationId: "createTransfer", summary: "Create transfer", description: "Move funds between two accounts the customer owns.", tags: ["payments"] } },
      "/transfers/{id}": { get: { operationId: "getTransfer", summary: "Transfer status", description: "Read the status of a transfer.", tags: ["payments"] } },
      "/rates": { get: { operationId: "getRates", summary: "Current rates", description: "Posted deposit and lending rates.", tags: ["rates"] } },
      "/cases": { post: { operationId: "createCase", summary: "Open service case", description: "Open a service case against an account.", tags: ["service"] } },
    },
  },
  null,
  2,
)

const SAMPLE_CURL = `curl -X POST https://api.northwind.example/v2/transfers \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"from":"acc_1","to":"acc_2","amount":250}'`

interface Op {
  key: string
  name: string
  method: string
  path: string
  description: string
  tag: string
}

type Resolution = "skip" | "overwrite" | "rename"

interface Result {
  created: string[]
  skipped: string[]
  failed: { name: string; reason: string }[]
}

function parseError(text: string, e: unknown): { line: number; message: string } {
  const msg = e instanceof Error ? e.message : String(e)
  const lc = msg.match(/line (\d+)/)
  if (lc) return { line: Number(lc[1]), message: msg }
  const pos = msg.match(/position (\d+)/)
  if (pos) return { line: text.slice(0, Number(pos[1])).split("\n").length, message: msg }
  return { line: 1, message: msg }
}

function parseOpenApi(text: string): { ops: Op[]; baseUrl: string } {
  const doc = JSON.parse(text) as { openapi?: string; swagger?: string; servers?: { url: string }[]; host?: string; basePath?: string; paths?: Record<string, Record<string, { operationId?: string; summary?: string; description?: string; tags?: string[] }>> }
  if (!doc.openapi && !doc.swagger) throw new Error("Not an OpenAPI 3.x or Swagger 2 document: missing the openapi or swagger field (line 1)")
  if (!doc.paths) throw new Error("The document has no paths (line 1)")
  const ops: Op[] = []
  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue
      ops.push({ key: `${method} ${path}`, name: op.summary ?? op.operationId ?? `${method} ${path}`, method: method.toUpperCase(), path, description: op.description ?? "", tag: op.tags?.[0] ?? "untagged" })
    }
  }
  const baseUrl = doc.servers?.[0]?.url ?? (doc.host ? `https://${doc.host}${doc.basePath ?? ""}` : "")
  return { ops, baseUrl }
}

function parseCurl(text: string): { ops: Op[]; baseUrl: string } {
  const url = text.match(/https?:\/\/[^\s'"\\]+/)?.[0]
  if (!url) throw new Error("cURL must contain a URL (line 1)")
  const method = (text.match(/-X\s+(\w+)/)?.[1] ?? (/\s(-d|--data)\s/.test(text) ? "POST" : "GET")).toUpperCase()
  const u = new URL(url)
  const last = u.pathname.split("/").filter(Boolean).pop() ?? "request"
  return { ops: [{ key: `${method} ${u.pathname}`, name: `${method === "GET" ? "Get" : "Create"} ${last}`, method, path: u.pathname, description: `Imported from cURL: ${method} ${u.pathname}`, tag: "curl" }], baseUrl: u.origin }
}

export function ImportToolsDialog({ from, onClose }: { from: "openapi" | "curl"; onClose: () => void }) {
  const { base } = useWs()
  const tools = useMock((s) => s.tools)
  const secrets = useMock((s) => s.secrets)
  const integrations = useMock((s) => s.integrations)
  const importTools = useMock((s) => s.importTools)
  const updateTool = useMock((s) => s.updateTool)
  const deleteTool = useMock((s) => s.deleteTool)

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<"url" | "paste" | "upload">(from === "curl" ? "paste" : "url")
  const [url, setUrl] = useState("")
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ line: number; message: string } | null>(null)
  const [ops, setOps] = useState<Op[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [resolution, setResolution] = useState<Record<string, Resolution>>({})
  const [baseUrl, setBaseUrl] = useState("")
  const [auth, setAuth] = useState("none")
  const [prefix, setPrefix] = useState("")
  const [activate, setActivate] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const exists = (name: string) => tools.find((t) => t.name.toLowerCase() === name.toLowerCase())
  const tags = useMemo(() => Array.from(new Set(ops.map((o) => o.tag))), [ops])
  const connected = integrations.filter((i) => i.status === "connected")

  const preview = () => {
    setError(null)
    const run = (source: string) => {
      try {
        const parsed = from === "curl" ? parseCurl(source) : parseOpenApi(source)
        setOps(parsed.ops)
        setBaseUrl(parsed.baseUrl)
        setSelected(new Set(parsed.ops.map((o) => o.key)))
        setResolution(Object.fromEntries(parsed.ops.filter((o) => exists(o.name)).map((o) => [o.key, "skip" as Resolution])))
        setStep(2)
      } catch (e) {
        setError(parseError(source, e))
      }
    }
    if (from === "openapi" && mode === "url") {
      if (!/^https?:\/\//.test(url)) {
        setError({ line: 1, message: "Enter an absolute URL to an OpenAPI document" })
        return
      }
      setBusy(true)
      setTimeout(() => { setBusy(false); run(SAMPLE_SPEC) }, 700)
      return
    }
    if (!text.trim()) {
      setError({ line: 1, message: from === "curl" ? "Paste a cURL command" : "Paste or upload an OpenAPI document" })
      return
    }
    run(text)
  }

  const toggle = (key: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(key)
    else next.delete(key)
    setSelected(next)
  }

  const runImport = () => {
    const chosen = ops.filter((o) => selected.has(o.key))
    const out: Result = { created: [], skipped: [], failed: [] }
    const defs: { name: string; description: string; method: string; url: string }[] = []
    for (const o of chosen) {
      const existing = exists(`${prefix}${o.name}`) ?? exists(o.name)
      const res = existing ? resolution[o.key] ?? "skip" : undefined
      if (res === "skip") { out.skipped.push(`${o.name} (already exists)`); continue }
      if (!/^https?:\/\//.test(baseUrl)) { out.failed.push({ name: o.name, reason: "No absolute base URL; set one on Configure" }); continue }
      if (res === "overwrite" && existing) deleteTool(existing.id)
      const name = res === "rename" ? `${o.name} (imported)` : o.name
      defs.push({ name, description: o.description, method: o.method, url: `${baseUrl.replace(/\/$/, "")}${o.path.replace(/\{(\w+)\}/g, "{{input.$1}}")}` })
    }
    const created = defs.length ? importTools(defs, { activate, prefix }) : []
    if (auth !== "none") {
      const [kind, ref] = auth.split(":")
      created.forEach((t: Tool) => t.rest && updateTool(t.id, { rest: { ...t.rest, auth: kind as "secret" | "integration", authRef: ref } }))
    }
    out.created = created.map((t) => t.name)
    setResult(out)
    setStep(4)
    if (created.length) toast.success(`Imported ${created.length} tool${created.length === 1 ? "" : "s"}`)
  }

  const steps = ["Source", "Preview", "Configure", "Results"] as const

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{from === "curl" ? "Import from cURL" : "Import from OpenAPI"}</DialogTitle>
          <DialogDescription>Turn {from === "curl" ? "a cURL command into a tool" : "an OpenAPI 3.x or Swagger 2 document into one tool per operation"} without typing each one by hand.</DialogDescription>
        </DialogHeader>
        <Stepper steps={steps} current={step} onStepClick={step < 4 ? setStep : undefined} />

        {step === 1 && (
          <div className="space-y-4">
            {from === "openapi" && (
              <RadioGroup value={mode} onValueChange={(v) => { setMode(v as typeof mode); setError(null) }} className="flex flex-wrap gap-4">
                {(["url", "paste", "upload"] as const).map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <RadioGroupItem value={m} id={`src-${m}`} />
                    <Label htmlFor={`src-${m}`} className="font-normal">{m === "url" ? "From URL" : m === "paste" ? "Paste" : "Upload file"}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {from === "openapi" && mode === "url" && (
              <div className="space-y-1.5">
                <Label htmlFor="spec-url">Document URL</Label>
                <Input id="spec-url" className="font-mono text-xs md:text-xs" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/openapi.json" />
                <p className="text-xs text-muted-foreground">JSON or YAML, up to 10 MB.</p>
              </div>
            )}
            {(from === "curl" || mode === "paste") && (
              <div className="space-y-1.5">
                <Label htmlFor="spec-text">{from === "curl" ? "cURL command" : "OpenAPI document"}</Label>
                <Textarea id="spec-text" className="min-h-[220px] font-mono text-xs md:text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={from === "curl" ? "curl -X GET https://api.example.com/v1/items" : '{ "openapi": "3.0.3", … }'} />
              </div>
            )}
            {from === "openapi" && mode === "upload" && (
              <div className="space-y-1.5">
                <Label htmlFor="spec-file">OpenAPI file</Label>
                <Input
                  id="spec-file"
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > 10 * 1024 * 1024) { setError({ line: 1, message: "File is larger than 10 MB" }); return }
                    setFileName(f.name)
                    setText(await f.text())
                  }}
                />
                {fileName && <p className="font-mono text-xs text-muted-foreground">{fileName}</p>}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { setMode("paste"); setText(from === "curl" ? SAMPLE_CURL : SAMPLE_SPEC); setError(null) }}>
              {from === "curl" ? "Use sample command" : "Use sample spec"}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Could not read the {from === "curl" ? "command" : "document"} (line {error.line})</AlertTitle>
                <AlertDescription>{error.message}. Fix it and preview again.</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{selected.size} of {ops.length} selected</span>
              <Button variant="outline" size="sm" className="h-7" onClick={() => setSelected(new Set(selected.size === ops.length ? [] : ops.map((o) => o.key)))}>
                {selected.size === ops.length ? "Clear all" : "Select all"}
              </Button>
              {tags.length > 1 && tags.map((t) => (
                <Button key={t} variant="ghost" size="sm" className="h-7" onClick={() => setSelected(new Set(ops.filter((o) => o.tag === t).map((o) => o.key)))}>
                  Only {t}
                </Button>
              ))}
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Collision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.map((o) => {
                    const clash = exists(o.name)
                    return (
                      <TableRow key={o.key}>
                        <TableCell><Checkbox checked={selected.has(o.key)} onCheckedChange={(v) => toggle(o.key, !!v)} aria-label={`Select ${o.name}`} /></TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{o.name}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono text-xs">{o.method}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{o.path}</TableCell>
                        <TableCell className="min-w-[180px] text-xs text-muted-foreground">{o.description}</TableCell>
                        <TableCell>
                          {clash ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge tone="warn" icon={AlertTriangle} label="Exists" />
                              <Select value={resolution[o.key] ?? "skip"} onValueChange={(v) => setResolution({ ...resolution, [o.key]: v as Resolution })}>
                                <SelectTrigger size="sm" className="h-7 w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">Skip</SelectItem>
                                  <SelectItem value="overwrite">Overwrite</SelectItem>
                                  <SelectItem value="rename">Rename</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">New</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="imp-base">Base URL</Label>
              <Input id="imp-base" className="font-mono text-xs md:text-xs" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v2" />
              <p className="text-xs text-muted-foreground">Overrides the server in the document. Path parameters become inputs, for example <span className="font-mono">{"{{input.id}}"}</span>.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Auth</Label>
              <Select value={auth} onValueChange={setAuth}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Secret header</SelectLabel>
                    {secrets.filter((s) => s.isActive).map((s) => <SelectItem key={s.id} value={`secret:${s.name}`}><span className="font-mono text-xs">{s.name}</span></SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Integration</SelectLabel>
                    {connected.map((i) => <SelectItem key={i.id} value={`integration:${i.id}`}>{i.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imp-prefix">Name prefix</Label>
              <Input id="imp-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Core · " />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 sm:col-span-2">
              <div>
                <Label htmlFor="imp-activate">Activate on import</Label>
                <p className="text-xs text-muted-foreground">Off imports as drafts so you can test each one before assistants can call it.</p>
              </div>
              <Switch id="imp-activate" checked={activate} onCheckedChange={setActivate} />
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-3">
            <Rows className="rounded-md border">
              {result.created.map((n) => <Row key={n} leading={<StatusBadge tone="good" icon={CheckCircle2} label="Created" />} title={n} />)}
              {result.skipped.map((n) => <Row key={n} leading={<StatusBadge tone="neutral" icon={MinusCircle} label="Skipped" />} title={n} />)}
              {result.failed.map((f) => (
                <Row key={f.name} leading={<StatusBadge tone="bad" icon={XCircle} label="Failed" />} title={f.name} description={f.reason} trailing={<Button size="sm" variant="outline" onClick={() => setStep(3)}>Retry</Button>} />
              ))}
              {!result.created.length && !result.skipped.length && !result.failed.length && <Row title="Nothing was selected" description="Go back to Preview and select at least one operation." />}
            </Rows>
          </div>
        )}

        <DialogFooter>
          {step === 4 ? (
            <>
              <Button variant="outline" asChild><Link href={`${base}/tools`} onClick={onClose}>Back to tools</Link></Button>
              <Button onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => (step === 1 ? onClose() : setStep(step - 1))}>{step === 1 ? "Cancel" : "Back"}</Button>
              {step === 1 && <Button onClick={preview} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Preview</Button>}
              {step === 2 && <Button onClick={() => setStep(3)} disabled={!selected.size}>Configure</Button>}
              {step === 3 && <Button onClick={runImport}>Import {selected.size}</Button>}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
