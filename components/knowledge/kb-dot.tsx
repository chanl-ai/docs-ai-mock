import { cn } from "@/lib/utils"

export const KB_COLORS: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  teal: "bg-teal-500",
}

export function KbDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", KB_COLORS[color] ?? "bg-slate-400", className)} />
}
