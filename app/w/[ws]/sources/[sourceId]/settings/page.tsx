import { Suspense } from "react"
import { SourceSettings } from "@/components/sources/source-settings"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SourceSettings />
    </Suspense>
  )
}
