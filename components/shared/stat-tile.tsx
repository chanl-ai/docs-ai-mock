import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "default" | "bad" | "warn" | "good"
  href?: string
  className?: string
}

/** One number, proportional figures, a label above and a hint below. */
export function StatTile({ label, value, hint, tone = "default", href, className }: StatTileProps) {
  const body = (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-4 py-3", href && "transition-colors hover:bg-accent/40", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-semibold leading-tight tracking-tight", tone === "bad" && "text-destructive", tone === "warn" && "text-amber-600 dark:text-amber-400", tone === "good" && "text-emerald-600 dark:text-emerald-400")}>{value}</span>
      {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>
}
