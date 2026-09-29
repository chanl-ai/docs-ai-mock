"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, ExternalLink, Lock, Play, Save } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { CodeBlock } from "@/components/shared/code-sample"
import { ExecutionStatusBadge } from "@/components/shared/status-badge"
import { Section } from "@/components/shared/surface"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { ms } from "@/lib/format"
import type { Execution, ToolField } from "@/lib/mock/types"
import { cn } from "@/lib/utils"
import { useToolDraft } from "./tool-context"
import { validateTool } from "./tool-helpers"

function initialValues(fields: ToolField[], example?: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  fields.forEach((f) => {
    if (example && f.name in example) out[f.name] = example[f.name]
    else if (f.type === "boolean") out[f.name] = false
  })
  return out
}

export function TestPanel({ compact }: { compact?: boolean }) {
  const { base } = useWs()
  const { admin } = useRole()
  const { saved, draft, dirty, canTest } = useToolDraft()
  const secrets = useMock((s) => s.secrets)
  const runTool = useMock((s) => s.runTool)
  const updateTool = useMock((s) => s.updateTool)
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(saved.inputSchema, saved.example?.input))
  const [raw, setRaw] = useState(false)
  const [rawText, setRawText] = useState(() => JSON.stringify(initialValues(saved.inputSchema, saved.example?.input), null, 2))
  const [rawError, setRawError] = useState<string | null>(null)
  const [result, setResult] = useState<Execution | null>(null)
  const [errors, setErrors] = useState<string[] | null>(null)

  const setValue = (k: string, v: unknown) => setValues({ ...values, [k]: v })

  const currentInput = (): Record<string, unknown> | null => {
    if (!raw) {
      return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "" && v !== undefined))
    }
    try {
      const parsed = JSON.parse(rawText)
      setRawError(null)
      return parsed
    } catch (e) {
      setRawError(e instanceof Error ? e.message : "Invalid JSON")
      return null
    }
  }

  const run = () => {
    const input = currentInput()
    if (!input) return
    const exec = runTool(saved.id, input)
    setResult(exec)
    if (exec.status === "failed") toast.error("Test failed", { description: exec.error?.message })
    else toast.success(`Ran in ${ms(exec.durationMs)}`)
  }

  const toggleRaw = (on: boolean) => {
    if (on) setRawText(JSON.stringify(currentInput() ?? {}, null, 2))
    else {
      try { setValues(JSON.parse(rawText)); setRawError(null) } catch { /* keep form values when the JSON is invalid */ }
    }
    setRaw(on)
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Section
        title="Test"
        description={compact ? "Runs the saved version with these inputs." : "Run the saved version with these inputs. Every run is logged as an execution."}
        actions={
          <Toggle size="sm" variant="outline" pressed={raw} onPressedChange={toggleRaw} aria-label="Raw JSON" className="h-8 px-2 text-xs">
            Raw JSON
          </Toggle>
        }
      >
        <div className="space-y-4">
          {!canTest && (
            <Alert>
              <Lock className="size-4" />
              <AlertTitle>Testing is limited to admins</AlertTitle>
              <AlertDescription>An admin can turn on &ldquo;Available to members&rdquo; on the General tab.</AlertDescription>
            </Alert>
          )}
          {dirty && (
            <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">You have unsaved changes. Tests run the saved v{saved.version}; save to test your edits.</p>
          )}
          {raw ? (
            <div className="space-y-1.5">
              <Textarea className="min-h-[160px] font-mono text-xs md:text-xs" value={rawText} onChange={(e) => setRawText(e.target.value)} aria-label="Input JSON" />
              {rawError && <p className="text-xs text-destructive">{rawError}</p>}
            </div>
          ) : saved.inputSchema.length === 0 ? (
            <p className="text-sm text-muted-foreground">This tool takes no inputs.</p>
          ) : (
            <div className="grid gap-3">
              {saved.inputSchema.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={`in-${f.name}`} className="flex items-center gap-1">
                    <span className="font-mono text-xs">{f.name}</span>
                    {f.required && <span className="text-destructive" aria-label="required">*</span>}
                    <span className="text-xs font-normal text-muted-foreground">· {f.type}</span>
                  </Label>
                  {f.type === "boolean" ? (
                    <Switch id={`in-${f.name}`} checked={!!values[f.name]} onCheckedChange={(v) => setValue(f.name, v)} />
                  ) : f.type === "enum" ? (
                    <Select value={(values[f.name] as string) ?? ""} onValueChange={(v) => setValue(f.name, v)}>
                      <SelectTrigger id={`in-${f.name}`} className="w-full font-mono text-xs"><SelectValue placeholder="Pick a value" /></SelectTrigger>
                      <SelectContent>{(f.enum ?? []).map((e) => <SelectItem key={e} value={e} className="font-mono text-xs">{e}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : f.type === "number" ? (
                    <Input id={`in-${f.name}`} type="number" className="tabular-nums" value={(values[f.name] as number | undefined) ?? ""} onChange={(e) => setValue(f.name, e.target.value === "" ? "" : Number(e.target.value))} />
                  ) : f.type === "object" ? (
                    <Textarea
                      id={`in-${f.name}`}
                      className="font-mono text-xs md:text-xs"
                      rows={3}
                      defaultValue={values[f.name] ? JSON.stringify(values[f.name], null, 2) : ""}
                      onBlur={(e) => { try { setValue(f.name, e.target.value ? JSON.parse(e.target.value) : undefined) } catch { toast.error(`${f.name} is not valid JSON`) } }}
                      placeholder="{ }"
                    />
                  ) : (
                    <Input id={`in-${f.name}`} value={(values[f.name] as string) ?? ""} onChange={(e) => setValue(f.name, e.target.value)} />
                  )}
                  {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={run} disabled={!canTest}><Play className="size-4" /> Run</Button>
            <Button size="sm" variant="outline" onClick={() => setErrors(validateTool(draft, secrets))}>Validate</Button>
          </div>
          {errors && (
            errors.length ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>{errors.length} problem{errors.length === 1 ? "" : "s"}</AlertTitle>
                <AlertDescription><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Schema and templates are valid</AlertTitle>
              </Alert>
            )
          )}
        </div>
      </Section>

      {result && (
        <Card className={cn("gap-3 py-4", result.status === "failed" && "border-destructive/50")}>
          <CardHeader className="px-4">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              <ExecutionStatusBadge status={result.status} />
              <span className="tabular-nums text-muted-foreground">{ms(result.durationMs)}</span>
              <Link href={`${base}/executions/${result.id}`} className="ml-auto inline-flex items-center gap-1 text-xs font-normal underline-offset-4 hover:underline">
                Open execution <ExternalLink className="size-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>{result.error.message}</AlertTitle>
                {result.error.stack && (
                  <AlertDescription>
                    <pre className="mt-1 overflow-x-auto whitespace-pre font-mono text-xs">{result.error.stack}</pre>
                  </AlertDescription>
                )}
              </Alert>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Output</p>
                <CodeBlock code={JSON.stringify(result.output ?? {}, null, 2)} maxHeight={260} />
              </div>
            )}
            {result.logs && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Logs</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{result.logs.join("\n")}</pre>
              </div>
            )}
            {result.status === "success" && admin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { updateTool(saved.id, { example: { input: result.input, output: result.output ?? {} } }); toast.success("Saved as the example", { description: "Assistants see it alongside the description." }) }}
              >
                <Save className="size-4" /> Save as example
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
