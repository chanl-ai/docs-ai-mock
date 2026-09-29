import { Skeleton } from "@/components/ui/skeleton"

/** Shown only while the workspace resolves. Pages use region-shaped skeletons instead. */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 shrink-0 border-r p-3 md:block">
        <Skeleton className="mb-6 h-10 w-full" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-7 w-full" />
        ))}
      </div>
      <div className="flex-1">
        <div className="flex h-12 items-center gap-3 border-b px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-7 w-56" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
