import { Suspense } from "react"
import { SourceItems } from "@/components/sources/source-items"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SourceItems />
    </Suspense>
  )
}
