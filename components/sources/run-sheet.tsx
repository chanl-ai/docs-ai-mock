"use client"

import Link from "next/link"
import { Download, Info, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FieldRow } from "@/components/shared/surface"
import { RunStatusBadge } from "@/components/shared/status-badge"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { dateTime, duration, ms, num, relative } from "@/lib/format"
import type { SyncRun } from "@/lib/mock/types"
import { backoffRetryAt, PhaseIcon, phaseLabel, phaseStatusLabel } from "./source-helpers"

const triggerLabel: Record<SyncRun["trigger"], string> = { manual: "Manual", schedule: "Schedule", webhook: "Webhook", full: "Full resync", retry: "Retry failed" }
const errorClassLabel = { parse: "Parse", fetch: "Fetch", permission: "Permission", too_large: "Too large", rate_limited: "Rate limited" } as const

export function RunSheet({ run, open, onOpenChange }: { run?: SyncRun; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { base } = useWs()
  const syncSource = useMock((s) => s.syncSource)
  const reprocessItem = useMock((s) => s.reprocessItem)
  const source = useMock((s) => (run ? s.sources.find((x) => x.id === run.sourceId) : undefined))
  const anyRunning = useMock((s) => (run ? s.runs.some((r) => r.sourceId === run.sourceId && r.status === "running") : false))

  const connectionFailure = !!run?.errors.some((e) => e.errorClass === "permission" && !e.itemId)
  const itemErrors = run?.errors.filter((e) => e.itemId) ?? []
  const running = run?.status === "running"
  const retryDisabled = connectionFailure || anyRunning || source?.status === "revoked" || (run?.counts.failed ?? 0) === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[620px]">
        {run && (
          <>
            <SheetHeader className="border-b px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <SheetTitle>Run {dateTime(run.startedAt)}</SheetTitle>
                <RunStatusBadge status={run.status} />
              </div>
              <SheetDescription className="font-mono text-xs">{run.id}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-6 px-5 py-4">
                {run.status === "backing_off" && (
                  <Alert>
                    <Info className="size-4" />
                    <AlertDescription>
                      Backing off: the site asked to slow down. The run resumes at {dateTime(backoffRetryAt(run))} ({relative(backoffRetryAt(run))}).
                    </AlertDescription>
                  </Alert>
                )}
                {run.cursorRejected && (
                  <Alert>
                    <Info className="size-4" />
                    <AlertDescription>The saved cursor was rejected; a full listing ran and {num(run.counts.deleted)} unseen items were removed.</AlertDescription>
                  </Alert>
                )}

                <div>
                  <FieldRow label="Trigger" value={triggerLabel[run.trigger]} />
                  <FieldRow label="Started" value={dateTime(run.startedAt)} />
                  <FieldRow label="Duration" value={running ? `${duration(Math.max(0, Math.round((Date.now() - new Date(run.startedAt).getTime()) / 1000)))} so far` : duration(run.durationSec)} />
                  <FieldRow label="Cursor before" value={run.cursorBefore} mono />
                  <FieldRow label="Cursor after" value={run.cursorAfter} mono />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Counts</h3>
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
                    {([
                      ["Listed", run.counts.listed],
                      ["Unchanged", run.counts.unchanged],
                      ["Upserted", run.counts.upserted],
                      ["Deleted", run.counts.deleted],
                      ["Failed", run.counts.failed],
                      ["Skipped by rules", run.counts.skipped],
                    ] as const).map(([k, v]) => (
                      <div key={k} className="bg-card px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className={k === "Failed" && v > 0 ? "text-lg font-semibold tabular-nums text-destructive" : "text-lg font-semibold tabular-nums"}>{num(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Phases</h3>
                  {running && run.progress && (
                    <div className="mb-3 space-y-1.5">
                      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                        <span>{num(run.progress.done)} of {num(run.progress.total)} items, {num(run.progress.failed)} failed</span>
                        <span>{Math.round((run.progress.done / Math.max(run.progress.total, 1)) * 100)}%</span>
                      </div>
                      <Progress value={(run.progress.done / Math.max(run.progress.total, 1)) * 100} />
                    </div>
                  )}
                  <ol className="divide-y rounded-md border">
                    {run.phases.map((p) => (
                      <li key={p.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <PhaseIcon status={p.status} />
                        <span className="flex-1">{phaseLabel[p.name]}</span>
                        <span className="text-xs text-muted-foreground">{phaseStatusLabel(p.status)}</span>
                        <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{p.status === "skipped" ? "—" : ms(p.durationMs)}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Errors</h3>
                  {connectionFailure && (
                    <Alert variant="destructive" className="mb-3">
                      <Info className="size-4" />
                      <AlertDescription className="space-y-2">
                        <p>{run.errors.find((e) => !e.itemId)?.message}. Retry is disabled because the failure is at the connection level.</p>
                        <Button asChild size="sm" variant="outline" className="border-destructive/40 text-foreground"><Link href={`${base}/integrations`}>Open Integrations</Link></Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {run.errors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No errors in this run.</p>
                  ) : (itemErrors.length > 0 || !connectionFailure) && (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow><TableHead>Item</TableHead><TableHead>Phase</TableHead><TableHead>Class</TableHead><TableHead>Message</TableHead><TableHead className="w-10" /></TableRow>
                        </TableHeader>
                        <TableBody>
                          {run.errors.filter((e) => !(connectionFailure && !e.itemId)).map((e, i) => (
                            <TableRow key={`${e.itemId}-${i}`}>
                              <TableCell className="max-w-[160px] truncate font-medium">{e.itemTitle}</TableCell>
                              <TableCell>{phaseLabel[e.phase]}</TableCell>
                              <TableCell><Badge variant="outline" className="font-normal">{errorClassLabel[e.errorClass]}</Badge></TableCell>
                              <TableCell className="max-w-[200px] whitespace-normal text-xs text-muted-foreground">{e.message}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" className="h-7" disabled={!e.itemId} onClick={() => { reprocessItem(e.itemId); toast.success("Reprocessing item", { description: e.itemTitle }) }}>Reprocess</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <Accordion type="single" collapsible defaultValue={running ? "log" : undefined}>
                  <AccordionItem value="log" className="rounded-md border px-3">
                    <AccordionTrigger className="py-2 text-sm">Log ({run.log.length} lines)</AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-56 rounded bg-muted/50">
                        <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{run.log.join("\n")}</pre>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
            <div className="flex flex-wrap gap-2 border-t px-5 py-3">
              <Button size="sm" disabled={retryDisabled} onClick={() => { syncSource(run.sourceId, { retry: true }); toast.success("Retrying failed items", { description: `${run.counts.failed} from this run` }) }}>
                <RotateCcw className="size-3.5" /> Retry failed items
              </Button>
              <Button size="sm" variant="outline" disabled={anyRunning || source?.status === "revoked"} onClick={() => { syncSource(run.sourceId, { full: run.trigger === "full", retry: run.trigger === "retry" }); toast.success("Run started with the same options", { description: triggerLabel[run.trigger] }) }}>
                <RefreshCw className="size-3.5" /> Re-run with same options
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toast.success("Log downloaded", { description: `${run.id}.log · ${run.log.length} lines` })}>
                <Download className="size-3.5" /> Download log
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
