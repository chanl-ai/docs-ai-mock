import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/** One bounded surface; rows inside separate with hairlines. Never nest one inside another. */
export function Section({ title, description, actions, children, className, bodyClassName, flush }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; flush?: boolean }) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && "p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

/** A homogeneous list as rows, not cards. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn("min-w-0 divide-y", className)}>{children}</ul>
}

export function Row({ leading, title, description, trailing, href, onClick, className }: { leading?: ReactNode; title: ReactNode; description?: ReactNode; trailing?: ReactNode; href?: string; onClick?: () => void; className?: string }) {
  const inner = (
    <>
      {leading && <div className="flex shrink-0 items-center">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {description && <div className="truncate text-xs text-muted-foreground">{description}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums">{trailing}</div>}
    </>
  )
  const base = cn("flex min-w-0 items-center gap-3 px-4 py-2.5", (href || onClick) && "transition-colors hover:bg-accent/50", className)
  if (href) {
    return (
      <li>
        <Link href={href} className={base}>
          {inner}
        </Link>
      </li>
    )
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={cn(base, "w-full text-left")}>
          {inner}
        </button>
      </li>
    )
  }
  return <li className={base}>{inner}</li>
}

/** Label/value pairs: label in a fixed column, value left-aligned, mono when it is an identifier. */
export function FieldRow({ label, value, mono, className, wrap }: { label: string; value: ReactNode; mono?: boolean; className?: string; wrap?: boolean }) {
  const empty = value === null || value === undefined || value === ""
  return (
    <div className={cn("flex min-h-9 items-start gap-3 border-t py-2 first:border-t-0", className)}>
      <span className="w-32 shrink-0 pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 flex-1 text-sm", !wrap && "truncate", mono && "font-mono text-xs tabular-nums", empty && "text-muted-foreground/60")}>{empty ? "—" : value}</span>
    </div>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-xs", className)}>{children}</code>
}
