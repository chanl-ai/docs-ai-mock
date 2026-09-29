import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  badge?: ReactNode
  /** Sentence naming the scope, e.g. "Applies to the whole workspace." */
  scope?: ReactNode
  tabs?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, badge, scope, tabs, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
          {scope && <p className="text-xs text-muted-foreground">{scope}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs}
    </div>
  )
}
