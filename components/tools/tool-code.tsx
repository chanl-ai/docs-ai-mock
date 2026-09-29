"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, FileCode2, Loader2, Pencil, Plus, Rocket, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Section } from "@/components/shared/surface"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { StatusBadge } from "@/components/shared/status-badge"
import { FormSkeleton, PageStateGate } from "@/components/shared/states"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { cn } from "@/lib/utils"
import { useToolDraft } from "./tool-context"

export function ToolCode() {
  const state = usePageState()
  const { base } = useWs()
  const { draft, saved, patch, readOnly, dirty, save } = useToolDraft()
  const secrets = useMock((s) => s.secrets)
  const deployTool = useMock((s) => s.deployTool)
  const [selected, setSelected] = useState(draft.code?.entry ?? "")
  const [newFile, setNewFile] = useState("")
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameTo, setRenameTo] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deployOpen, setDeployOpen] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [deploying, setDeploying] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  if (!draft.code) {
    return (
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertTitle>This is a REST tool</AlertTitle>
        <AlertDescription>Code settings apply to code tools only. Open the REST tab instead.</AlertDescription>
      </Alert>
    )
  }
  const code = draft.code
  const file = code.files.find((f) => f.path === selected) ?? code.files[0]
  const setCode = (p: Partial<typeof code>) => patch({ code: { ...code, ...p } })
  const deployed = saved.code?.deployedVersion

  const deploy = () => {
    if (dirty) save()
    const version = useMock.getState().tools.find((t) => t.id === saved.id)?.version ?? saved.version
    const lines = [
      `[build] tool ${saved.slug} v${version}`,
      `[build] runtime ${code.language === "python" ? "python 3.12" : "node 22"}`,
      `[build] ${code.files.length} file${code.files.length === 1 ? "" : "s"}, entry ${code.entry}`,
      code.language === "python" ? "[deps] pip install -r requirements.txt (0 packages)" : "[deps] npm ci (0 packages)",
      `[env] injecting ${code.secrets.length} secret${code.secrets.length === 1 ? "" : "s"}${code.secrets.length ? ": " + code.secrets.join(", ") : ""}`,
      "[smoke] calling handler with the saved example",
      "[smoke] ok",
      `[deploy] v${version} is live`,
    ]
    setLog([])
    setDeploying(true)
    setDeployOpen(true)
    let i = 0
    timer.current = setInterval(() => {
      setLog((l) => [...l, lines[i]])
      i += 1
      if (i >= lines.length) {
        if (timer.current) clearInterval(timer.current)
        deployTool(saved.id)
        setDeploying(false)
        toast.success(`Deployed v${version}`, { description: saved.name })
      }
    }, 300)
  }

  const addFile = () => {
    const p = newFile.trim()
    if (!p || code.files.some((f) => f.path === p)) return
    setCode({ files: [...code.files, { path: p, content: "" }] })
    setSelected(p)
    setNewFile("")
  }

  return (
    <PageStateGate state={state} loading={<FormSkeleton />}>
      <div className="flex flex-col gap-5">
        <Section
          title={
            <span className="flex flex-wrap items-center gap-2">
              Code
              <Badge variant="outline" className="font-normal">{code.language === "python" ? "Python 3.12" : "JavaScript · Node 22"}</Badge>
              {deployed ? (
                <StatusBadge tone={deployed === saved.version ? "good" : "warn"} icon={deployed === saved.version ? CheckCircle2 : AlertTriangle} label={`Deployed v${deployed}`} />
              ) : (
                <StatusBadge tone="neutral" icon={AlertTriangle} label="Not deployed" />
              )}
            </span>
          }
          description={deployed && deployed !== saved.version ? `v${saved.version} is saved but not deployed. Assistants still run v${deployed}.` : "The handler receives the input object and a context with secrets as environment variables."}
          actions={!readOnly && <Button size="sm" onClick={deploy} disabled={deploying}>{deploying ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Deploy</Button>}
          flush
        >
          <div className="grid min-w-0 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="border-b md:border-b-0 md:border-r">
              <ul className="p-2">
                {code.files.map((f) => (
                  <li key={f.path} className="group flex items-center">
                    <Button variant="ghost" size="sm" className={cn("h-8 min-w-0 flex-1 justify-start gap-2 px-2 font-mono text-xs", f.path === file?.path && "bg-accent")} onClick={() => setSelected(f.path)}>
                      <FileCode2 className="size-3.5 shrink-0" />
                      <span className="truncate">{f.path}</span>
                      {f.path === code.entry && <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px] font-normal">entry</Badge>}
                    </Button>
                    {!readOnly && (
                      <>
                        <Button variant="ghost" size="icon" className="size-7" aria-label={`Rename ${f.path}`} onClick={() => { setRenaming(f.path); setRenameTo(f.path) }}><Pencil className="size-3" /></Button>
                        {f.path !== code.entry && <Button variant="ghost" size="icon" className="size-7" aria-label={`Delete ${f.path}`} onClick={() => setDeleting(f.path)}><Trash2 className="size-3" /></Button>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {!readOnly && (
                <div className="flex gap-1 border-t p-2">
                  <Input className="h-8 font-mono text-xs md:text-xs" placeholder="utils.py" value={newFile} onChange={(e) => setNewFile(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFile()} aria-label="New file name" />
                  <Button size="icon" variant="outline" className="size-8 shrink-0" aria-label="Add file" onClick={addFile}><Plus className="size-4" /></Button>
                </div>
              )}
            </div>
            <div className="min-w-0 p-3">
              {file ? (
                <Textarea
                  aria-label={`Editor for ${file.path}`}
                  className="min-h-[360px] font-mono text-xs md:text-xs leading-relaxed"
                  spellCheck={false}
                  disabled={readOnly}
                  value={file.content}
                  onChange={(e) => setCode({ files: code.files.map((f) => (f.path === file.path ? { ...f, content: e.target.value } : f)) })}
                />
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No files. Add one to start.</p>
              )}
            </div>
          </div>
        </Section>

        <Section title="Environment secrets" description="Injected as environment variables at run time. Values are never written to logs.">
          {secrets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No secrets yet. <Link href={`${base}/secrets`} className="underline underline-offset-4">Create one in Secrets</Link>.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {secrets.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={code.secrets.includes(s.name)}
                      disabled={readOnly}
                      onCheckedChange={(v) => setCode({ secrets: v ? [...code.secrets, s.name] : code.secrets.filter((x) => x !== s.name) })}
                    />
                    <span className="truncate font-mono text-xs">{s.name}</span>
                    {!s.isActive && <Badge variant="outline" className="font-normal">Inactive</Badge>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Imports that use the old name need updating by hand.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rename-file">Path</Label>
            <Input id="rename-file" className="font-mono text-xs md:text-xs" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              disabled={!renameTo.trim() || code.files.some((f) => f.path === renameTo.trim() && f.path !== renaming)}
              onClick={() => {
                const to = renameTo.trim()
                setCode({ files: code.files.map((f) => (f.path === renaming ? { ...f, path: to } : f)), entry: code.entry === renaming ? to : code.entry })
                if (selected === renaming) setSelected(to)
                setRenaming(null)
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting}?`}
        description="The file is removed from the draft. It stays in the deployed version until you deploy again."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setCode({ files: code.files.filter((f) => f.path !== deleting) }); if (selected === deleting) setSelected(code.entry); setDeleting(null) }}
      />

      <Sheet open={deployOpen} onOpenChange={setDeployOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Deploy {saved.name}</SheetTitle>
            <SheetDescription>{deploying ? "Building and running the smoke test…" : "Build finished. Assistants now run this version."}</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <ScrollArea className="h-[60vh] rounded-md border bg-muted/40">
              <pre className="p-3 font-mono text-xs leading-relaxed">
                {log.map((l, i) => <div key={i}>{l}</div>)}
                {deploying && <div className="text-muted-foreground">…</div>}
              </pre>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </PageStateGate>
  )
}
