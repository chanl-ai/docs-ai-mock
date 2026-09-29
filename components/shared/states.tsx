"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, Lock, type LucideIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { PageState } from "@/hooks/use-page-state"

interface Action {
  label: string
  href?: string
  onClick?: () => void
}

function ActionButton({ action, variant = "default" }: { action: Action; variant?: "default" | "outline" }) {
  if (action.href) {
    return (
      <Button asChild variant={variant} size="sm">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }
  return (
    <Button variant={variant} size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

/** Empty state: defines the noun and offers the verb. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: LucideIcon
  title: string
  description: ReactNode
  action?: Action
  secondaryAction?: Action
  className?: string
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="mb-5 max-w-md text-sm text-muted-foreground">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
        </div>
      )}
    </div>
  )
}

/** Filtered-empty is different from empty: "No results match" plus Clear filters. */
export function NoResults({ onClear, what = "results" }: { onClear?: () => void; what?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
      <p>No {what} match the current filters.</p>
      {onClear && (
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

/** Error: says what happened and what to do next. */
export function ErrorState({
  title = "This page did not load",
  message = "The request to the server failed. Your session is still valid; retrying usually works. If it keeps failing, the service may be down.",
  onRetry,
  className,
}: {
  title?: string
  message?: ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <Alert variant="destructive" className={cn("max-w-2xl", className)}>
      <AlertTriangle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="border-destructive/40 text-foreground">
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function PermissionDenied({ requiredRole = "Admin", ws = "northwind" }: { requiredRole?: string; ws?: string }) {
  return (
    <Alert className="max-w-2xl">
      <Lock className="size-4" />
      <AlertTitle>You do not have access to this page</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          This page needs the {requiredRole} role. You are signed in as a Member. An owner or admin can change your role from the Team page.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/w/${ws}/team`}>Open Team</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="rounded-md border">
        <div className="grid gap-4 border-b px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 border-b px-4 py-3 last:border-b-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-40" : "w-16")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Routes a page through its four shared states. `ready` renders children;
 * `loading`/`error`/`empty` render the matching region-shaped state.
 */
export function PageStateGate({
  state,
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  state: PageState
  loading?: ReactNode
  error?: ReactNode
  empty?: ReactNode
  onRetry?: () => void
  children: ReactNode
}) {
  if (state === "loading") return <>{loading ?? <TableSkeleton />}</>
  if (state === "error") return <>{error ?? <ErrorState onRetry={onRetry ?? (() => window.location.assign(window.location.pathname))} />}</>
  if (state === "empty" && empty) return <>{empty}</>
  return <>{children}</>
}
