"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepperProps {
  steps: readonly string[]
  current: number // 1-based
  onStepClick?: (step: number) => void
  orientation?: "horizontal" | "vertical"
  className?: string
}

/** The wizard step track. Horizontal on narrow screens, a vertical rail when asked. */
export function Stepper({ steps, current, onStepClick, orientation = "horizontal", className }: StepperProps) {
  if (orientation === "vertical") {
    return (
      <ol className={cn("flex flex-col gap-1", className)}>
        {steps.map((label, index) => {
          const step = index + 1
          const done = step < current
          const isCurrent = step === current
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!onStepClick || step > current}
                onClick={() => onStepClick?.(step)}
                className={cn("flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors", isCurrent ? "bg-accent font-medium text-foreground" : "text-muted-foreground", onStepClick && step <= current && "hover:bg-accent/60")}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium", isCurrent && "bg-primary text-primary-foreground", done && "bg-primary/15 text-primary", !isCurrent && !done && "bg-muted text-muted-foreground")}>
                  {done ? <Check className="size-3" /> : step}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    )
  }
  return (
    <ol className={cn("flex w-full items-center", className)}>
      {steps.map((label, index) => {
        const step = index + 1
        const done = step < current
        const isCurrent = step === current
        const isLast = step === steps.length
        return (
          <li key={label} className={cn("flex items-center", !isLast && "flex-1")}>
            <button type="button" disabled={!onStepClick || step > current} onClick={() => onStepClick?.(step)} className="flex items-center gap-2 whitespace-nowrap disabled:cursor-default">
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors", isCurrent && "bg-primary text-primary-foreground", done && "bg-primary/15 text-primary", !isCurrent && !done && "bg-muted text-muted-foreground")} aria-current={isCurrent ? "step" : undefined}>
                {done ? <Check className="size-3" /> : step}
              </span>
              <span className={cn("hidden text-xs md:inline", isCurrent ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            </button>
            {!isLast && <div aria-hidden className={cn("mx-2 h-px flex-1 md:mx-3", done ? "bg-primary/30" : "bg-border")} />}
          </li>
        )
      })}
    </ol>
  )
}
