"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { ListChecks, Play, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataTable } from "@/components/shared/data-table"
import { StatTile, StatRow } from "@/components/shared/stat-tile"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate, StatSkeleton } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { ms, pct, relative } from "@/lib/format"
import type { TestQuestion } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

export default function KbEvalsPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { base } = useWs()
  const { admin } = useRole()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const questions = useMock((s) => s.testQuestions.filter((q) => q.kbId === kb.id))
  const runTestSet = useMock((s) => s.runTestSet)
  const addTestQuestion = useMock((s) => s.addTestQuestion)
  const removeTestQuestion = useMock((s) => s.removeTestQuestion)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [q, setQ] = useState("")
  const [cite, setCite] = useState("")
  const [expected, setExpected] = useState("")

  const data = state === "empty" ? [] : questions
  const scored = data.filter((x) => x.lastResult)
  const passRate = scored.length ? scored.filter((x) => x.lastResult!.pass).length / scored.length : 0
  const precision = scored.length ? scored.reduce((n, x) => n + x.lastResult!.precision, 0) / scored.length : 0
  const groundedness = scored.length ? scored.reduce((n, x) => n + x.lastResult!.groundedness, 0) / scored.length : 0
  const lastRun = scored.map((x) => x.lastResult!.ranAt).sort().pop()
  const gate = passRate >= 0.9 && groundedness >= 0.9

  const run = () => {
    setRunning(true)
    setProgress(0)
    const total = Math.max(questions.length, 1)
    let i = 0
    const t = setInterval(() => {
      i++
      setProgress((i / total) * 100)
      if (i >= total) {
        clearInterval(t)
        runTestSet(kb.id)
        setRunning(false)
        toast.success("Test set finished")
      }
    }, 350)
  }

  const columns = useMemo<ColumnDef<TestQuestion>[]>(
    () => [
      { accessorKey: "question", header: "Question", cell: ({ row }) => <div className="min-w-0"><div className="font-medium">{row.original.question}</div>{row.original.expected && <div className="truncate text-xs text-muted-foreground">Expected: {row.original.expected}</div>}</div> },
      { accessorKey: "mustCite", header: "Must cite", cell: ({ row }) => <span className="text-muted-foreground">{row.original.mustCite || "—"}</span> },
      { id: "result", accessorFn: (r) => (r.lastResult ? (r.lastResult.pass ? "pass" : "fail") : "unrun"), header: "Result", cell: ({ row }) => (row.original.lastResult ? row.original.lastResult.pass ? <StatusBadge tone="good" icon={CheckCircle2} label="Pass" /> : <StatusBadge tone="bad" icon={XCircle} label="Fail" /> : <StatusBadge tone="neutral" icon={ListChecks} label="Not run" />), filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)) },
      { id: "score", accessorFn: (r) => r.lastResult?.topScore ?? 0, header: "Top score", meta: { align: "right" }, cell: ({ row }) => row.original.lastResult ? row.original.lastResult.topScore.toFixed(2) : "—" },
      { id: "precision", accessorFn: (r) => r.lastResult?.precision ?? 0, header: "Precision", meta: { align: "right" }, cell: ({ row }) => row.original.lastResult ? <span className={cn(row.original.lastResult.precision < 0.8 && "text-destructive")}>{pct(row.original.lastResult.precision)}</span> : "—" },
      { id: "groundedness", accessorFn: (r) => r.lastResult?.groundedness ?? 0, header: "Groundedness", meta: { align: "right" }, cell: ({ row }) => row.original.lastResult ? <span className={cn(row.original.lastResult.groundedness < 0.9 && "text-destructive")}>{pct(row.original.lastResult.groundedness)}</span> : "—" },
      { id: "latency", accessorFn: (r) => r.lastResult?.latencyMs ?? 0, header: "Latency", meta: { align: "right" }, cell: ({ row }) => row.original.lastResult ? ms(row.original.lastResult.latencyMs) : "—" },
      {
        id: "actions",
        header: "",
        size: 80,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button asChild variant="ghost" size="sm" className="h-7"><Link href={`${base}/kb/${kb.id}/playground?q=${encodeURIComponent(row.original.question)}`}><Play className="size-3.5" /></Link></Button>
            {admin && <Button variant="ghost" size="sm" className="h-7" onClick={() => { removeTestQuestion(row.original.id); toast.message("Removed from the test set") }} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
          </div>
        ),
      },
    ],
    [admin, base, kb.id, removeTestQuestion]
  )

  return (
    <PageStateGate state={state} loading={<StatSkeleton />}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="max-w-2xl text-sm text-muted-foreground">Golden questions with known answers. Every settings change and every source refresh re-runs them; precision and groundedness gate the release of a new index.</p>
          <div className="flex items-center gap-2">
            {admin && <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus className="size-3.5" /> Add question</Button>}
            <Button size="sm" onClick={run} disabled={running || !questions.length}>{running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run test set</Button>
          </div>
        </div>
        {running && <Progress value={progress} className="h-1.5" />}
        {data.length > 0 && (
          <StatRow>
            <StatTile label="Pass rate" value={scored.length ? pct(passRate) : "—"} tone={scored.length ? (passRate >= 0.9 ? "good" : "warn") : "default"} hint={`${scored.filter((x) => x.lastResult!.pass).length} of ${scored.length} passed`} />
            <StatTile label="Precision" value={scored.length ? pct(precision) : "—"} hint="cited chunks that were relevant" />
            <StatTile label="Groundedness" value={scored.length ? pct(groundedness) : "—"} tone={scored.length && groundedness < 0.9 ? "warn" : "default"} hint="claims supported by a citation" />
            <StatTile label="Release gate" value={scored.length ? (gate ? "Open" : "Blocked") : "—"} tone={scored.length ? (gate ? "good" : "bad") : "default"} hint={lastRun ? `last run ${relative(lastRun)} · needs ≥ 90% pass and groundedness` : "needs ≥ 90% pass and groundedness"} />
          </StatRow>
        )}
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => r.id}
          hideViewOptions
          filters={[{ column: "result", title: "Result", options: [{ label: "Pass", value: "pass" }, { label: "Fail", value: "fail" }, { label: "Not run", value: "unrun" }] }]}
          emptyState={<div className="rounded-lg border"><EmptyState icon={ListChecks} title="No golden questions yet" description="A golden question is one with a known answer and the document it must cite. Pin one from the playground, or add it here, and the set runs on every change." action={{ label: "Open playground", href: `${base}/kb/${kb.id}/playground` }} secondaryAction={admin ? { label: "Add question", onClick: () => setAddOpen(true) } : undefined} /></div>}
        />
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add a golden question</DialogTitle><DialogDescription>Give the question, the document it must cite and, optionally, the expected answer.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Question</Label><Input value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
            <div className="space-y-1.5"><Label>Must cite document</Label><Input value={cite} onChange={(e) => setCite(e.target.value)} placeholder="Parental leave policy" /></div>
            <div className="space-y-1.5"><Label>Expected answer (optional)</Label><Input value={expected} onChange={(e) => setExpected(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={q.trim().length < 5} onClick={() => { addTestQuestion({ kbId: kb.id, question: q.trim(), mustCite: cite.trim(), expected: expected.trim() || undefined }); setAddOpen(false); setQ(""); setCite(""); setExpected(""); toast.success("Question added") }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStateGate>
  )
}
