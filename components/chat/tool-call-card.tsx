"use client"

import Link from "next/link"
import { CheckCircle2, ExternalLink, Loader2, Wrench, XCircle } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { CodeBlock } from "@/components/shared/code-sample"
import { useWs } from "@/lib/mock/hooks"
import { ms } from "@/lib/format"
import type { ChatMessage } from "@/lib/mock/types"

type ToolCall = NonNullable<ChatMessage["toolCall"]>

export function ToolCallCard({ call, running, defaultOpen = true }: { call: ToolCall; running?: boolean; defaultOpen?: boolean }) {
  const { base } = useWs()
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-md border bg-muted/30 text-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Wrench className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{call.toolName}</span>
        {running ? (
          <StatusBadge tone="info" icon={Loader2} label="Running" pulse />
        ) : call.status === "success" ? (
          <StatusBadge tone="good" icon={CheckCircle2} label="Success" />
        ) : (
          <StatusBadge tone="bad" icon={XCircle} label="Failed" />
        )}
        {!running && <span className="text-xs tabular-nums text-muted-foreground">{ms(call.durationMs)}</span>}
        <div className="ml-auto flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs">Input and output</Button>
          </CollapsibleTrigger>
          {!running && (
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href={`${base}/executions/${call.executionId}`}>
                Execution <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent className="grid gap-2 border-t p-3 md:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">Input</p>
          <CodeBlock code={JSON.stringify(call.input, null, 2)} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">Output</p>
          {running ? <p className="text-xs text-muted-foreground">Waiting for the tool to return…</p> : <CodeBlock code={JSON.stringify(call.output, null, 2)} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
