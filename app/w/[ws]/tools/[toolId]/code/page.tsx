import { Suspense } from "react"
import { ToolCode } from "@/components/tools/tool-code"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ToolCode />
    </Suspense>
  )
}
