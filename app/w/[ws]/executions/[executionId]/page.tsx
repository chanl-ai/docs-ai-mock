import { Suspense } from "react"
import { ExecutionList } from "@/components/executions/execution-list"

export default async function Page({ params }: { params: Promise<{ executionId: string }> }) {
  const { executionId } = await params
  return (
    <Suspense fallback={null}>
      <ExecutionList executionId={executionId} />
    </Suspense>
  )
}
