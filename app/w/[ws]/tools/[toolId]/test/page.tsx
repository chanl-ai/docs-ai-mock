import { Suspense } from "react"
import { TestPanel } from "@/components/tools/test-panel"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <div className="max-w-3xl">
        <TestPanel />
      </div>
    </Suspense>
  )
}
