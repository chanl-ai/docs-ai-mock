import { Suspense } from "react"
import { ExecutionList } from "@/components/executions/execution-list"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExecutionList />
    </Suspense>
  )
}
