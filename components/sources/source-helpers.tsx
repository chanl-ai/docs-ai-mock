"use client"

import { useParams } from "next/navigation"
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { DeleteDialog } from "@/components/shared/dialogs"
import { Progress } from "@/components/ui/progress"
import { useMock } from "@/lib/mock/store"
import { num } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { RunPhase, Source, SyncRun } from "@/lib/mock/types"

/** The source named by the route, or undefined when it does not exist (deleted, bad link). */
export function useRouteSource() {
  const params = useParams<{ sourceId: string }>()
  const id = params?.sourceId ?? ""
  const source = useMock((s) => s.sources.find((x) => x.id === id))
  return { id, source }
}

export function runningRunFor(runs: SyncRun[], sourceId: string) {
  return runs.find((r) => r.sourceId === sourceId && r.status === "running")
}

export const phaseLabel: Record<RunPhase["name"], string> = {
  list: "List changes",
  fetch: "Fetch",
  parse: "Parse",
  chunk: "Chunk",
  embed: "Embed",
  upsert: "Upsert",
}

export function PhaseIcon({ status }: { status: RunPhase["status"] }) {
  if (status === "done") return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Done" />
  if (status === "running") return <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" aria-label="Running" />
  if (status === "failed") return <XCircle className="size-4 text-destructive" aria-label="Failed" />
  return <CircleDashed className="size-4 text-muted-foreground" aria-label="Not run" />
}

export function phaseStatusLabel(status: RunPhase["status"]) {
  return status === "done" ? "Done" : status === "running" ? "Running" : status === "failed" ? "Failed" : "Not run"
}

/** Indeterminate bar for rows whose run has no reliable total yet. */
export function IndeterminateProgress({ className }: { className?: string }) {
  return <Progress value={100} className={cn("h-1 w-20 animate-pulse", className)} aria-label="Sync running" />
}

/** When a backing-off run retries, from the Retry-After in its error, or 15 minutes. */
export function backoffRetryAt(run: SyncRun) {
  const m = run.errors.map((e) => e.message.match(/Retry-After (\d+)s/)).find(Boolean)
  const wait = m ? Number(m[1]) : 900
  return new Date(new Date(run.startedAt).getTime() + (run.durationSec + wait) * 1000).toISOString()
}

export function SourceDeleteDialog({ source, open, onOpenChange, onDeleted }: { source: Source; open: boolean; onOpenChange: (o: boolean) => void; onDeleted?: () => void }) {
  const kbs = useMock((s) => s.kbs)
  const itemCount = useMock((s) => s.items.filter((i) => i.sourceId === source.id).length)
  const deleteSource = useMock((s) => s.deleteSource)
  const readers = kbs.filter((k) => k.sources.some((l) => l.sourceId === source.id) || source.usedByKbIds.includes(k.id))
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${source.name}?`}
      objectName={source.name}
      description={`The source, its sync history and its ${num(itemCount)} items are removed. Files in the library are kept.`}
      dependents={[{ kind: "knowledge base", names: readers.map((k) => k.name) }]}
      consequence={readers.length ? `Chunks in ${readers.length} knowledge base${readers.length === 1 ? "" : "s"} will be removed.` : undefined}
      onConfirm={() => {
        deleteSource(source.id)
        toast.success("Source deleted", { description: source.name })
        onDeleted?.()
      }}
    />
  )
}
