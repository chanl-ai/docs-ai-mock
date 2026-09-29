import { Suspense } from "react"
import { SourceOverview } from "@/components/sources/source-overview"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SourceOverview />
    </Suspense>
  )
}
