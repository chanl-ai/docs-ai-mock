import { Suspense } from "react"
import { SourcesList } from "@/components/sources/sources-list"

export default function SourcesPage() {
  return (
    <Suspense fallback={null}>
      <SourcesList />
    </Suspense>
  )
}
