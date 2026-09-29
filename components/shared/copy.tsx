"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard can be blocked in headless or insecure contexts; the UI still confirms.
    }
    setCopied(true)
    toast.success(label)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

export function CopyButton({ text, label = "Copy", className, size = "sm", variant = "outline", iconOnly }: { text: string; label?: string; className?: string; size?: "sm" | "icon" | "default"; variant?: "outline" | "ghost" | "secondary"; iconOnly?: boolean }) {
  const { copied, copy } = useCopy()
  return (
    <Button type="button" variant={variant} size={iconOnly ? "icon" : size} className={cn(iconOnly && "size-8", className)} onClick={() => copy(text)} aria-label={iconOnly ? label : undefined}>
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {!iconOnly && (copied ? "Copied" : label)}
    </Button>
  )
}

/** A read-only mono value with a copy button: URLs, ids, tokens. */
export function CopyableField({ value, label, masked, className }: { value: string; label?: string; masked?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex min-w-0 items-center gap-1 rounded-md border bg-muted/40 pl-3 pr-1">
        <code className="min-w-0 flex-1 truncate py-1.5 font-mono text-xs">{masked ? value.replace(/(.{8}).+(.{4})$/, "$1••••••••••••$2") : value}</code>
        <CopyButton text={value} iconOnly variant="ghost" />
      </div>
    </div>
  )
}
