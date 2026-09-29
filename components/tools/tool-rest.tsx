"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Section } from "@/components/shared/surface"
import { FormSkeleton, PageStateGate } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import type { Tool } from "@/lib/mock/types"
import { useToolDraft } from "./tool-context"
import { integrationFor, secretIssues, validateTool } from "./tool-helpers"

type Rest = NonNullable<Tool["rest"]>

function PairTable({ rows, onChange, readOnly, left, right, leftPlaceholder, rightPlaceholder, rightMono = true }: { rows: [string, string][]; onChange: (rows: [string, string][]) => void; readOnly: boolean; left: string; right: string; leftPlaceholder: string; rightPlaceholder: string; rightMono?: boolean }) {
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[140px]">{left}</TableHead>
                <TableHead className="min-w-[200px]">{right}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([a, b], i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell><Input className="h-8 font-mono text-xs md:text-xs" value={a} disabled={readOnly} placeholder={leftPlaceholder} aria-label={left} onChange={(e) => onChange(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} /></TableCell>
                  <TableCell><Input className={rightMono ? "h-8 font-mono text-xs" : "h-8"} value={b} disabled={readOnly} placeholder={rightPlaceholder} aria-label={right} onChange={(e) => onChange(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} /></TableCell>
                  <TableCell>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!readOnly && (
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, ["", ""]])}>
          <Plus className="size-4" /> Add {left.toLowerCase()}
        </Button>
      )}
    </div>
  )
}

export function ToolRest() {
  const state = usePageState()
  const { base } = useWs()
  const { draft, patch, readOnly } = useToolDraft()
  const secrets = useMock((s) => s.secrets)
  const integrations = useMock((s) => s.integrations)
  const reconnect = useMock((s) => s.reconnectIntegration)
  const [errors, setErrors] = useState<string[] | null>(null)

  if (!draft.rest) {
    return (
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertTitle>This is a code tool</AlertTitle>
        <AlertDescription>REST settings apply to REST tools only. Open the Code tab instead.</AlertDescription>
      </Alert>
    )
  }
  const rest = draft.rest
  const set = (p: Partial<Rest>) => patch({ rest: { ...rest, ...p } })
  const { missing, inactive } = secretIssues(draft, secrets)
  const integ = integrationFor(draft, integrations)
  const connected = integrations.filter((i) => i.status === "connected" || i.status === "needs_reauth")

  return (
    <PageStateGate state={state} loading={<FormSkeleton />}>
      <div className="flex flex-col gap-5">
        {(missing.length > 0 || inactive.length > 0) && (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertTitle>{missing.length ? `Secret ${missing.join(", ")} does not exist` : `Secret ${inactive.join(", ")} is inactive`}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Calls fail until the secret {missing.length ? "is created" : "is activated or rotated"}.</p>
              <Button asChild size="sm" variant="outline" className="border-destructive/40 text-foreground"><Link href={`${base}/secrets`}>Open Secrets</Link></Button>
            </AlertDescription>
          </Alert>
        )}
        {integ && integ.status !== "connected" && (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertTitle>{integ.name} is {integ.status === "needs_reauth" ? "waiting for reauthorisation" : "not connected"}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>This tool authenticates through the {integ.name} connection. Calls fail until it is reconnected.</p>
              <div className="flex flex-wrap gap-2">
                {integ.status === "needs_reauth" && <Button size="sm" variant="outline" className="border-destructive/40 text-foreground" onClick={() => { reconnect(integ.id); toast.success(`${integ.name} reconnected`) }}>Reconnect</Button>}
                <Button asChild size="sm" variant="outline" className="border-destructive/40 text-foreground"><Link href={`${base}/integrations`}>Open Integrations</Link></Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Section
          title="Request"
          actions={<Button size="sm" variant="outline" onClick={() => { const e = validateTool(draft, secrets); setErrors(e); if (!e.length) toast.success("No problems found") }}>Validate</Button>}
        >
          <div className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="space-y-1.5 sm:w-32">
                <Label>Method</Label>
                <Select value={rest.method} disabled={readOnly} onValueChange={(v) => set({ method: v as Rest["method"] })}>
                  <SelectTrigger className="w-full font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="r-url">URL</Label>
                <Input id="r-url" className="font-mono text-xs md:text-xs" value={rest.url} disabled={readOnly} onChange={(e) => set({ url: e.target.value })} placeholder="https://api.example.com/v1/items/{{input.id}}" />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Insert inputs with <span className="font-mono">{"{{input.name}}"}</span> and secrets with <span className="font-mono">{"{{secret.NAME}}"}</span>. Secrets are resolved server-side and never shown to the assistant.
            </p>
            {errors && errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>{errors.length} problem{errors.length === 1 ? "" : "s"} found</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
            {errors && errors.length === 0 && (
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Schema and templates are valid</AlertTitle>
              </Alert>
            )}
          </div>
        </Section>

        <Section title="Headers">
          <PairTable rows={rest.headers.map((h) => [h.key, h.value])} onChange={(r) => set({ headers: r.map(([key, value]) => ({ key, value })) })} readOnly={readOnly} left="Header" right="Value" leftPlaceholder="Authorization" rightPlaceholder="Bearer {{secret.NAME}}" />
        </Section>
        <Section title="Query parameters">
          <PairTable rows={rest.query.map((h) => [h.key, h.value])} onChange={(r) => set({ query: r.map(([key, value]) => ({ key, value })) })} readOnly={readOnly} left="Parameter" right="Value" leftPlaceholder="limit" rightPlaceholder="{{input.limit}}" />
        </Section>
        <Section title="Body" description="JSON with templating. Sent for POST, PUT and PATCH.">
          <Textarea className="min-h-[140px] font-mono text-xs md:text-xs" value={rest.body} disabled={readOnly} onChange={(e) => set({ body: e.target.value })} placeholder={'{\n  "subject": "{{input.subject}}"\n}'} />
        </Section>

        <Section title="Auth and limits">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Auth</Label>
              <Select value={rest.auth} disabled={readOnly} onValueChange={(v) => set({ auth: v as Rest["auth"], authRef: undefined })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="secret">Secret header</SelectItem>
                  <SelectItem value="integration">Integration connection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rest.auth === "secret" && (
              <div className="space-y-1.5">
                <Label>Secret</Label>
                <Select value={rest.authRef ?? ""} disabled={readOnly} onValueChange={(v) => set({ authRef: v })}>
                  <SelectTrigger className="w-full font-mono text-xs"><SelectValue placeholder="Pick a secret" /></SelectTrigger>
                  <SelectContent>
                    {secrets.map((s) => <SelectItem key={s.id} value={s.name} className="font-mono text-xs">{s.name}{s.isActive ? "" : " (inactive)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {rest.auth === "integration" && (
              <div className="space-y-1.5">
                <Label>Connection</Label>
                <Select value={rest.authRef ?? ""} disabled={readOnly} onValueChange={(v) => { patch({ rest: { ...rest, authRef: v }, integrationType: integrations.find((i) => i.id === v)?.type }) }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pick a connected app" /></SelectTrigger>
                  <SelectContent>
                    {connected.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}{i.status === "needs_reauth" ? " (needs reauth)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="r-timeout">Timeout (ms)</Label>
              <Input id="r-timeout" type="number" min={100} className="tabular-nums" value={rest.timeoutMs} disabled={readOnly} onChange={(e) => set({ timeoutMs: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-retries">Retries</Label>
              <Input id="r-retries" type="number" min={0} max={5} className="tabular-nums" value={rest.retries} disabled={readOnly} onChange={(e) => set({ retries: Number(e.target.value) })} />
            </div>
          </div>
        </Section>

        <Section title="Response mapping" description="Pick fields from the response with JSONPath. Unmapped responses are returned whole.">
          <PairTable rows={rest.responseMapping.map((m) => [m.field, m.path])} onChange={(r) => set({ responseMapping: r.map(([field, path]) => ({ field, path })) })} readOnly={readOnly} left="Output field" right="JSONPath" leftPlaceholder="balance" rightPlaceholder="$.data.balance" />
        </Section>
      </div>
    </PageStateGate>
  )
}
