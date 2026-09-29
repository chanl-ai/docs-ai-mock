"use client"

import { Compass } from "lucide-react"
import { EmptyState } from "@/components/shared/states"
import { useWs } from "@/lib/mock/hooks"

export default function WorkspaceNotFound() {
  const { base } = useWs()
  return (
    <div className="rounded-lg border">
      <EmptyState icon={Compass} title="This screen is not in the mock" description="The navigation entry exists so the shell is complete, but no page is built at this address yet. The routes that work are listed in the README." action={{ label: "Back to Home", href: base }} />
    </div>
  )
}
