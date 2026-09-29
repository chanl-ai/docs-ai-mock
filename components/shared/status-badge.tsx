import { AlertTriangle, CheckCircle2, CircleDashed, Clock, Loader2, MinusCircle, PauseCircle, ShieldAlert, ShieldCheck, Shield, XCircle, FileText, FileSpreadsheet, FileCode2, Image as ImageIcon, Globe, Presentation, File } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ItemStatus, KbHealth, RunStatus, Sensitivity, SourceStatus, ExecutionStatus, ToolStatus } from "@/lib/mock/types"

type Tone = "good" | "warn" | "bad" | "neutral" | "info"

const toneClass: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  bad: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
}

/** Status always carries an icon and a label as well as a hue. */
export function StatusBadge({ tone, icon: Icon, label, className, pulse }: { tone: Tone; icon: React.ComponentType<{ className?: string }>; label: string; className?: string; pulse?: boolean }) {
  return (
    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap font-medium", toneClass[tone], className)}>
      <Icon className={cn("size-3", pulse && "animate-spin")} />
      {label}
    </Badge>
  )
}

export function KbHealthBadge({ health, className }: { health: KbHealth; className?: string }) {
  switch (health) {
    case "healthy":
      return <StatusBadge tone="good" icon={CheckCircle2} label="Healthy" className={className} />
    case "indexing":
      return <StatusBadge tone="info" icon={Loader2} label="Indexing" className={className} pulse />
    case "degraded":
      return <StatusBadge tone="warn" icon={AlertTriangle} label="Degraded" className={className} />
    case "failed":
      return <StatusBadge tone="bad" icon={XCircle} label="Failed" className={className} />
    default:
      return <StatusBadge tone="neutral" icon={CircleDashed} label="Never indexed" className={className} />
  }
}

export function RunStatusBadge({ status, className }: { status?: RunStatus; className?: string }) {
  switch (status) {
    case "success":
      return <StatusBadge tone="good" icon={CheckCircle2} label="Success" className={className} />
    case "partial":
      return <StatusBadge tone="warn" icon={AlertTriangle} label="Partial" className={className} />
    case "failed":
      return <StatusBadge tone="bad" icon={XCircle} label="Failed" className={className} />
    case "running":
      return <StatusBadge tone="info" icon={Loader2} label="Running" className={className} pulse />
    case "backing_off":
      return <StatusBadge tone="warn" icon={Clock} label="Backing off" className={className} />
    default:
      return <StatusBadge tone="neutral" icon={CircleDashed} label="Never synced" className={className} />
  }
}

export function SourceStatusBadge({ status, className }: { status: SourceStatus; className?: string }) {
  switch (status) {
    case "active":
      return <StatusBadge tone="good" icon={CheckCircle2} label="Active" className={className} />
    case "paused":
      return <StatusBadge tone="neutral" icon={PauseCircle} label="Paused" className={className} />
    case "draft":
      return <StatusBadge tone="neutral" icon={CircleDashed} label="Draft" className={className} />
    case "revoked":
      return <StatusBadge tone="bad" icon={ShieldAlert} label="Connection revoked" className={className} />
  }
}

export function ItemStatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  switch (status) {
    case "indexed":
      return <StatusBadge tone="good" icon={CheckCircle2} label="Indexed" className={className} />
    case "pending":
      return <StatusBadge tone="neutral" icon={Clock} label="Pending" className={className} />
    case "processing":
      return <StatusBadge tone="info" icon={Loader2} label="Processing" className={className} pulse />
    case "failed":
      return <StatusBadge tone="bad" icon={XCircle} label="Failed" className={className} />
    case "partial":
      return <StatusBadge tone="warn" icon={AlertTriangle} label="Partial" className={className} />
    case "excluded":
      return <StatusBadge tone="neutral" icon={MinusCircle} label="Excluded" className={className} />
    case "deleted":
      return <StatusBadge tone="neutral" icon={MinusCircle} label="Deleted at source" className={className} />
  }
}

export function ExecutionStatusBadge({ status, className }: { status: ExecutionStatus; className?: string }) {
  switch (status) {
    case "success":
      return <StatusBadge tone="good" icon={CheckCircle2} label="Success" className={className} />
    case "failed":
      return <StatusBadge tone="bad" icon={XCircle} label="Failed" className={className} />
    case "running":
      return <StatusBadge tone="info" icon={Loader2} label="Running" className={className} pulse />
    case "pending":
      return <StatusBadge tone="neutral" icon={Clock} label="Pending" className={className} />
    case "cancelled":
      return <StatusBadge tone="neutral" icon={MinusCircle} label="Cancelled" className={className} />
  }
}

export function ToolStatusBadge({ status, className }: { status: ToolStatus; className?: string }) {
  switch (status) {
    case "active":
      return <StatusBadge tone="good" icon={CheckCircle2} label="Active" className={className} />
    case "inactive":
      return <StatusBadge tone="neutral" icon={PauseCircle} label="Inactive" className={className} />
    case "draft":
      return <StatusBadge tone="neutral" icon={CircleDashed} label="Draft" className={className} />
  }
}

export function SensitivityBadge({ level, className }: { level: Sensitivity; className?: string }) {
  switch (level) {
    case "internal":
      return <StatusBadge tone="neutral" icon={Shield} label="Internal" className={className} />
    case "confidential":
      return <StatusBadge tone="warn" icon={ShieldCheck} label="Confidential" className={className} />
    case "restricted":
      return <StatusBadge tone="bad" icon={ShieldAlert} label="Restricted" className={className} />
  }
}

export function FreshnessBadge({ reviewBy, className }: { reviewBy: string; className?: string }) {
  const days = Math.round((new Date(reviewBy).getTime() - Date.now()) / 86400_000)
  if (days < 0) return <StatusBadge tone="warn" icon={AlertTriangle} label={`Stale · ${-days} d`} className={className} />
  if (days < 14) return <StatusBadge tone="warn" icon={Clock} label={`Review in ${days} d`} className={className} />
  return <StatusBadge tone="good" icon={CheckCircle2} label="Fresh" className={className} />
}

export function MimeIcon({ mime, className }: { mime: string; className?: string }) {
  const c = cn("size-4 shrink-0 text-muted-foreground", className)
  if (mime === "application/pdf") return <FileText className={cn(c, "text-red-500")} />
  if (mime.includes("spreadsheet") || mime === "text/csv") return <FileSpreadsheet className={cn(c, "text-emerald-600")} />
  if (mime.includes("presentation")) return <Presentation className={cn(c, "text-orange-500")} />
  if (mime.includes("wordprocessing")) return <FileText className={cn(c, "text-blue-500")} />
  if (mime === "text/markdown" || mime === "text/plain") return <FileCode2 className={c} />
  if (mime === "text/html") return <Globe className={c} />
  if (mime.startsWith("image/")) return <ImageIcon className={cn(c, "text-violet-500")} />
  return <File className={c} />
}
