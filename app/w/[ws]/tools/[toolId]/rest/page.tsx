import { Suspense } from "react"
import { ToolRest } from "@/components/tools/tool-rest"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ToolRest />
    </Suspense>
  )
}
