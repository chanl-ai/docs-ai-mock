import { Suspense } from "react"
import { ToolGeneral } from "@/components/tools/tool-general"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ToolGeneral />
    </Suspense>
  )
}
