import { Suspense, type ReactNode } from "react"
import { ToolShell } from "@/components/tools/tool-shell"

export default function ToolLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ToolShell>{children}</ToolShell>
    </Suspense>
  )
}
