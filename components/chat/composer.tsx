"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowUp, ChevronDown, Database, Paperclip, Square, Wrench, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { KbDot } from "@/components/knowledge/kb-dot"
import { useWs } from "@/lib/mock/hooks"
import { useRole } from "@/hooks/use-role"
import type { KnowledgeBase } from "@/lib/mock/types"

const MAX = 8000

export function KbChip({ kbs, value, onChange, disabled }: { kbs: KnowledgeBase[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const label = value.length === 0 ? "No knowledge base" : value.length === kbs.length ? "All knowledge bases" : value.length === 1 ? kbs.find((k) => k.id === value[0])?.name ?? "1 knowledge base" : `${value.length} knowledge bases`
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-full px-2.5 text-xs" disabled={disabled}>
          <Database className="size-3.5" /> {label} <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium">Knowledge bases</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onChange(value.length === kbs.length ? [] : kbs.map((k) => k.id))}>
            {value.length === kbs.length ? "Clear" : "Select all"}
          </Button>
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {kbs.map((k) => {
            const on = value.includes(k.id)
            return (
              <li key={k.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent">
                  <Checkbox checked={on} onCheckedChange={(c) => onChange(c ? [...value, k.id] : value.filter((v) => v !== k.id))} />
                  <KbDot color={k.color} />
                  <span className="truncate">{k.name}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function Composer({
  kbs,
  kbIds,
  onKbIds,
  tools,
  onTools,
  onSend,
  streaming,
  onStop,
  noKb,
}: {
  kbs: KnowledgeBase[]
  kbIds: string[]
  onKbIds: (v: string[]) => void
  tools: boolean
  onTools: (v: boolean) => void
  onSend: (text: string) => void
  streaming: boolean
  onStop: () => void
  noKb?: boolean
}) {
  const { base } = useWs()
  const { admin } = useRole()
  const [text, setText] = useState("")
  const [attached, setAttached] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const tooLong = text.length > MAX
  const canSend = !noKb && !streaming && text.trim().length > 0 && !tooLong && kbIds.length > 0

  const send = () => {
    if (!canSend) return
    onSend(text.trim())
    setText("")
    setAttached(null)
  }

  if (noKb) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p>No knowledge base is available to you.</p>
        {admin ? (
          <Link href={`${base}/kb/new`} className="text-xs underline underline-offset-4 hover:text-foreground">Create a knowledge base</Link>
        ) : (
          <p className="text-xs">Ask an admin to give you access to one.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background shadow-xs focus-within:ring-[3px] focus-within:ring-ring/30">
      {attached && (
        <div className="px-3 pt-2">
          <Badge variant="secondary" className="gap-1 pr-1 font-normal">
            <Paperclip className="size-3" /> {attached}
            <button type="button" onClick={() => setAttached(null)} className="rounded-sm hover:bg-foreground/10" aria-label="Remove attachment"><X className="size-3" /></button>
          </Badge>
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
        rows={2}
        placeholder="Ask the workspace…"
        aria-label="Message"
        className="max-h-48 min-h-[56px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
        <KbChip kbs={kbs} value={kbIds} onChange={onKbIds} />
        <Toggle size="sm" variant="outline" pressed={tools} onPressedChange={onTools} className="h-7 rounded-full px-2.5 text-xs" aria-label="Use tools">
          <Wrench className="size-3.5" /> Tools
        </Toggle>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            if (f.size > 10 * 1024 * 1024) toast.error("Attachments are limited to 10 MB")
            else setAttached(f.name)
            e.target.value = ""
          }}
        />
        <Button variant="ghost" size="icon" className="size-7" onClick={() => fileRef.current?.click()} aria-label="Attach an image or PDF">
          <Paperclip className="size-3.5" />
        </Button>
        <span className="ml-auto flex items-center gap-2">
          {tooLong && <span className="text-xs text-destructive tabular-nums">{text.length} / {MAX}</span>}
          {kbIds.length === 0 && <span className="text-xs text-muted-foreground">Pick a knowledge base</span>}
          {streaming ? (
            <Button size="sm" variant="outline" className="h-7" onClick={onStop}>
              <Square className="size-3 fill-current" /> Stop
            </Button>
          ) : (
            <Button size="icon" className="size-7" onClick={send} disabled={!canSend} aria-label="Send">
              <ArrowUp className="size-4" />
            </Button>
          )}
        </span>
      </div>
    </div>
  )
}
