import { Suspense, type ReactNode } from "react"
import { SourceShell } from "@/components/sources/source-shell"

export default function SourceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SourceShell>{children}</SourceShell>
    </Suspense>
  )
}
