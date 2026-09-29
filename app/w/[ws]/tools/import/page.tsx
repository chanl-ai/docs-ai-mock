import { Suspense } from "react"
import { ToolList } from "@/components/tools/tool-list"

export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  return (
    <Suspense fallback={null}>
      <ToolList dialog="import" importFrom={from === "curl" ? "curl" : "openapi"} />
    </Suspense>
  )
}
