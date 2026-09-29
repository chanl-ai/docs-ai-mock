"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ExternalLink, Lock, MessageSquare, RotateCcw, Terminal, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock } from "@/components/shared/code-sample"
import { useCopy } from "@/components/shared/copy"
import { EmptyState } from "@/components/shared/states"
import { ExecutionStatusBadge } from "@/components/shared/status-badge"
import { FieldRow, Row, Rows } from "@/components/shared/surface"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { dateTime, ms, relative } from "@/lib/format"
import type { Execution } from "@/lib/mock/types"

export const triggerLabel: Record<Execution["triggeredBy"]["kind"], string> = {
  member: "Member",
  api_key: "API key",
  mcp: "MCP client",
  chat: "Chat",
  test: "Test",
}

export function curlFor(e: Execution): string {
  if (!e.request) return `# ${e.toolName} is a code tool; it has no HTTP request to replay.`
  const lines = [`curl -X ${e.request.method} '${e.request.url}'`]
  Object.entries(e.request.headers).forEach(([k, v]) => lines.push(`  -H '${k}: ${/auth|key|token/i.test(k) || v.includes("•") ? "••••••••" : v}'`))
  if (e.request.body) lines.push(`  -d '${e.request.body}'`)
  return lines.join(" \\\n")
}

export function ExecutionSheet({ execution, visible, open, onOpenChange, onSelect }: { execution?: Execution; visible: boolean; open: boolean; onOpenChange: (o: boolean) => void; onSelect: (id: string) => void }) {
  const { base } = useWs()
  const rerun = useMock((s) => s.rerunExecution)
  const cancel = useMock((s) => s.cancelExecution)
  const executions = useMock((s) => s.executions)
  const { copy } = useCopy()
  const [tab, setTab] = useState("input")

  const e = visible ? execution : undefined
  useEffect(() => setTab("input"), [e?.id])
  const retryChain = e ? executions.filter((x) => x.toolId === e.toolId && JSON.stringify(x.input) === JSON.stringify(e.input) && x.id !== e.id).slice(0, 5) : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        {!e ? (
          <>
            <SheetHeader>
              <SheetTitle>Execution</SheetTitle>
              <SheetDescription className="sr-only">Execution detail</SheetDescription>
            </SheetHeader>
            <EmptyState icon={Lock} title="You cannot see this execution" description="It does not exist, was removed by the retention policy, or was started by someone else. Members see only their own executions and chat runs." />
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex flex-wrap items-center gap-2 pr-8">
                <Link href={`${base}/tools/${e.toolId}/general`} className="hover:underline">{e.toolName}</Link>
                <span className={e.status === "running" ? "animate-pulse" : undefined}><ExecutionStatusBadge status={e.status} /></span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Started {relative(e.startedAt)}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{e.status === "running" ? "Running" : ms(e.durationMs)}</span>
                <span aria-hidden>·</span>
                <Badge variant="outline" className="font-normal">{triggerLabel[e.triggeredBy.kind]}</Badge>
                <span>{e.triggeredBy.name}</span>
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { const n = rerun(e.id); if (n) { toast.success("Re-ran with the same input", { description: `${n.status === "failed" ? "Failed" : "Succeeded"} · ${n.id}` }); onSelect(n.id) } }}><RotateCcw className="size-4" /> Re-run</Button>
                {e.status === "running" && <Button size="sm" variant="outline" onClick={() => { cancel(e.id); toast.success("Execution cancelled") }}>Cancel</Button>}
                <Button size="sm" variant="outline" asChild><Link href={`${base}/tools/${e.toolId}/general`}><Wrench className="size-4" /> Open tool</Link></Button>
                {e.threadId && <Button size="sm" variant="outline" asChild><Link href={`${base}/chat/${e.threadId}`}><MessageSquare className="size-4" /> Open conversation</Link></Button>}
                {e.request && <Button size="sm" variant="outline" onClick={() => copy(curlFor(e), "cURL copied, secrets masked")}><Terminal className="size-4" /> Copy as cURL</Button>}
              </div>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="flex-wrap">
                    <TabsTrigger value="input">Input</TabsTrigger>
                    <TabsTrigger value="output">Output</TabsTrigger>
                    {e.request && <TabsTrigger value="request">Request</TabsTrigger>}
                    {e.logs && <TabsTrigger value="logs">Logs</TabsTrigger>}
                    <TabsTrigger value="context">Context</TabsTrigger>
                  </TabsList>
                  <TabsContent value="input" className="pt-3">
                    <CodeBlock code={JSON.stringify(e.input, null, 2)} />
                  </TabsContent>
                  <TabsContent value="output" className="space-y-3 pt-3">
                    {e.status === "running" || e.status === "pending" ? (
                      <div className="space-y-2 rounded-md border p-4">
                        <Progress value={45} className="h-1.5 animate-pulse" />
                        <p className="text-sm text-muted-foreground">Still running. The output appears here when it finishes; this view refreshes every 3 seconds.</p>
                      </div>
                    ) : e.error ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="size-4" />
                        <AlertTitle>{e.error.message}</AlertTitle>
                        {e.error.stack && (
                          <AlertDescription>
                            <pre className="mt-1 overflow-x-auto whitespace-pre font-mono text-xs">{e.error.stack}</pre>
                          </AlertDescription>
                        )}
                      </Alert>
                    ) : e.status === "cancelled" ? (
                      <p className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">Cancelled before it returned output.</p>
                    ) : (
                      <CodeBlock code={JSON.stringify(e.output ?? {}, null, 2)} />
                    )}
                  </TabsContent>
                  {e.request && (
                    <TabsContent value="request" className="space-y-4 pt-3">
                      <div>
                        <FieldRow label="Method" value={e.request.method} mono />
                        <FieldRow label="URL" value={e.request.url} mono wrap />
                        <FieldRow label="Response" value={<Badge variant="outline" className="font-mono text-xs">{e.request.responseStatus}</Badge>} />
                      </div>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent"><TableHead>Header</TableHead><TableHead>Value</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(e.request.headers).map(([k, v]) => (
                              <TableRow key={k}><TableCell className="font-mono text-xs">{k}</TableCell><TableCell className="font-mono text-xs">{v}</TableCell></TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {e.request.body && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Request body</p>
                          <CodeBlock code={e.request.body} maxHeight={200} />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Response body</p>
                        <CodeBlock code={e.request.responseBody} maxHeight={260} />
                      </div>
                    </TabsContent>
                  )}
                  {e.logs && (
                    <TabsContent value="logs" className="pt-3">
                      <ScrollArea className="h-72 rounded-md border bg-muted/40">
                        <pre className="p-3 font-mono text-xs leading-relaxed">{e.logs.join("\n")}</pre>
                      </ScrollArea>
                    </TabsContent>
                  )}
                  <TabsContent value="context" className="space-y-4 pt-3">
                    <div>
                      <FieldRow label="Execution id" value={e.id} mono />
                      <FieldRow label="Started" value={dateTime(e.startedAt)} />
                      <FieldRow label="Triggered by" value={`${triggerLabel[e.triggeredBy.kind]} · ${e.triggeredBy.name}`} />
                      <FieldRow label="Conversation" value={e.threadId ? <Link href={`${base}/chat/${e.threadId}`} className="inline-flex items-center gap-1 font-mono text-xs hover:underline">{e.threadId} <ExternalLink className="size-3" /></Link> : undefined} />
                      <FieldRow label="MCP client" value={e.triggeredBy.kind === "mcp" ? e.triggeredBy.name : undefined} />
                      <FieldRow label="Token" value={e.tokenName} />
                      <FieldRow label="Retries" value={String(e.retries)} mono />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Other runs with the same input</p>
                      {retryChain.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None. This is the only run with this input.</p>
                      ) : (
                        <Rows className="rounded-md border">
                          {retryChain.map((r) => (
                            <Row key={r.id} onClick={() => onSelect(r.id)} leading={<ExecutionStatusBadge status={r.status} />} title={<span className="font-mono text-xs">{r.id}</span>} trailing={<span className="text-xs text-muted-foreground">{relative(r.startedAt)}</span>} />
                          ))}
                        </Rows>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
