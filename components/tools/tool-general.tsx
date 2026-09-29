"use client"

import { useState } from "react"
import Link from "next/link"
import { History, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Section, Rows, Row } from "@/components/shared/surface"
import { TagInput } from "@/components/shared/tag-input"
import { FormSkeleton, PageStateGate } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useWs } from "@/lib/mock/hooks"
import { daysUntil, shortDate, snakeify } from "@/lib/format"
import type { Tool, ToolField } from "@/lib/mock/types"
import { useToolDraft } from "./tool-context"
import { scopeLabel } from "./tool-helpers"

type Scope = Tool["consumers"][number]["scope"]

export function ToolGeneral() {
  const state = usePageState()
  const { base } = useWs()
  const { draft, patch, readOnly } = useToolDraft()
  const [consumerName, setConsumerName] = useState("")
  const [consumerScope, setConsumerScope] = useState<Scope>("read")

  const setField = (i: number, p: Partial<ToolField>) => patch({ inputSchema: draft.inputSchema.map((f, j) => (j === i ? { ...f, ...p } : f)) })
  const setConsumer = (i: number, p: Partial<Tool["consumers"][number]>) => patch({ consumers: draft.consumers.map((c, j) => (j === i ? { ...c, ...p } : c)) })

  return (
    <PageStateGate state={state} loading={<FormSkeleton />}>
      <div className="flex flex-col gap-5">
        <Section title="Identity">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Name</Label>
              <Input id="g-name" value={draft.name} disabled={readOnly} onChange={(e) => patch({ name: e.target.value })} />
              <p className="text-xs text-muted-foreground">MCP tool name: <span className="font-mono">{snakeify(draft.name)}</span></p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea id="g-desc" rows={3} value={draft.description} disabled={readOnly} onChange={(e) => patch({ description: e.target.value })} />
              <p className="text-xs text-muted-foreground">This is what the assistant reads to decide when to call it.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-tags">Tags</Label>
              <TagInput id="g-tags" value={draft.tags} disabled={readOnly} onChange={(tags) => patch({ tags })} placeholder="Add a tag…" />
            </div>
          </div>
        </Section>

        <Section
          title="Input schema"
          description="Fields the assistant fills in. Reference them in the request as {{input.name}}."
          actions={!readOnly && <Button size="sm" variant="outline" onClick={() => patch({ inputSchema: [...draft.inputSchema, { name: "", type: "string", required: false, description: "" }] })}><Plus className="size-4" /> Add field</Button>}
          flush
        >
          {draft.inputSchema.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No inputs. The tool is called with an empty object.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[170px]">Field</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[80px]">Required</TableHead>
                    <TableHead className="min-w-[180px]">Description</TableHead>
                    <TableHead className="min-w-[180px]">Enum values</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.inputSchema.map((f, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell><Input className="h-8 font-mono text-xs md:text-xs" value={f.name} disabled={readOnly} onChange={(e) => setField(i, { name: e.target.value })} aria-label="Field name" placeholder="fieldName" /></TableCell>
                      <TableCell>
                        <Select value={f.type} disabled={readOnly} onValueChange={(v) => setField(i, { type: v as ToolField["type"] })}>
                          <SelectTrigger size="sm" className="w-full" aria-label="Field type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["string", "number", "boolean", "enum", "object"] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Checkbox checked={f.required} disabled={readOnly} onCheckedChange={(v) => setField(i, { required: !!v })} aria-label="Required" /></TableCell>
                      <TableCell><Input className="h-8" value={f.description} disabled={readOnly} onChange={(e) => setField(i, { description: e.target.value })} aria-label="Field description" /></TableCell>
                      <TableCell>
                        {f.type === "enum" ? (
                          <TagInput value={f.enum ?? []} disabled={readOnly} onChange={(v) => setField(i, { enum: v })} placeholder="Add value…" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Only for enum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!readOnly && (
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${f.name || "field"}`} onClick={() => patch({ inputSchema: draft.inputSchema.filter((_, j) => j !== i) })}>
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
        </Section>

        <Section title="Output">
          <div className="space-y-1.5">
            <Label htmlFor="g-out">Output description</Label>
            <Textarea id="g-out" rows={2} className="font-mono text-xs md:text-xs" value={draft.outputDescription} disabled={readOnly} onChange={(e) => patch({ outputDescription: e.target.value })} placeholder="{ id, status, … }" />
            <p className="text-xs text-muted-foreground">Tells the assistant what comes back so it can use the result in its answer.</p>
          </div>
        </Section>

        <Section title="Behaviour" flush>
          <Rows>
            <Row
              title="Requires confirmation"
              description="The assistant asks the person before running it. Use for anything that writes or sends."
              trailing={<Switch checked={draft.requiresConfirmation} disabled={readOnly} onCheckedChange={(v) => patch({ requiresConfirmation: v })} aria-label="Requires confirmation" />}
            />
            <Row
              title="Available to members"
              description="Members can test it and their chat assistant can call it. Off limits it to admins and granted consumers."
              trailing={<Switch checked={draft.availableToMembers} disabled={readOnly} onCheckedChange={(v) => patch({ availableToMembers: v })} aria-label="Available to members" />}
            />
          </Rows>
        </Section>

        <Section
          title="Consumers"
          description="Who may call this module and with what scope. Each grant can expire."
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/executions?tool=${draft.id}`}><History className="size-4" /> Call log</Link>
            </Button>
          }
          flush
        >
          <Rows>
            {draft.consumers.length === 0 && <Row title="No consumers yet" description="Add the assistant, MCP token or API key that should be able to call this tool." />}
            {draft.consumers.map((c, i) => {
              const d = daysUntil(c.expiresAt)
              return (
                <Row
                  key={`${c.name}-${i}`}
                  title={c.name}
                  description={c.expiresAt ? (d !== undefined && d < 0 ? `Expired ${shortDate(c.expiresAt)}` : `Expires ${shortDate(c.expiresAt)}`) : "No expiry"}
                  trailing={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Select value={c.scope} disabled={readOnly} onValueChange={(v) => setConsumer(i, { scope: v as Scope })}>
                        <SelectTrigger size="sm" className="w-40" aria-label={`Scope for ${c.name}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(scopeLabel) as Scope[]).map((s) => <SelectItem key={s} value={s}>{scopeLabel[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        className="hidden h-8 w-36 sm:block"
                        disabled={readOnly}
                        aria-label={`Expiry for ${c.name}`}
                        value={c.expiresAt ? c.expiresAt.slice(0, 10) : ""}
                        onChange={(e) => setConsumer(i, { expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      />
                      {!readOnly && (
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${c.name}`} onClick={() => patch({ consumers: draft.consumers.filter((_, j) => j !== i) })}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  }
                />
              )
            })}
          </Rows>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
              <Input className="h-8 min-w-0 flex-1 sm:max-w-xs" placeholder="Consumer name, e.g. Collections bot" value={consumerName} onChange={(e) => setConsumerName(e.target.value)} aria-label="New consumer name" />
              <Select value={consumerScope} onValueChange={(v) => setConsumerScope(v as Scope)}>
                <SelectTrigger size="sm" className="w-40" aria-label="New consumer scope"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(scopeLabel) as Scope[]).map((s) => <SelectItem key={s} value={s}>{scopeLabel[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!consumerName.trim() || draft.consumers.some((c) => c.name === consumerName.trim())}
                onClick={() => { patch({ consumers: [...draft.consumers, { name: consumerName.trim(), scope: consumerScope }] }); setConsumerName("") }}
              >
                <Plus className="size-4" /> Add consumer
              </Button>
            </div>
          )}
        </Section>
      </div>
    </PageStateGate>
  )
}
