import { Suspense } from "react"
import { ToolList } from "@/components/tools/tool-list"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ToolList dialog="create" />
    </Suspense>
  )
}
