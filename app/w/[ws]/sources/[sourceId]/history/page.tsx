import { Suspense } from "react"
import { SourceHistory } from "@/components/sources/source-history"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SourceHistory />
    </Suspense>
  )
}
