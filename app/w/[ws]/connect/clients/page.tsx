"use client"

import { useSearchParams } from "next/navigation"
import { CheckCircle2, Plug } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { ClientsGrid } from "@/components/connect/clients-grid"
import { usePageState } from "@/hooks/use-page-state"
import { useWs } from "@/lib/mock/hooks"

export default function ClientsPage() {
  const state = usePageState()
  const params = useSearchParams()
  const { base } = useWs()
  const authorized = params.get("authorized")

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI clients"
        description="Get an AI application talking to this workspace in a few steps. Pick a client for its setup, a way to verify the connection, and fixes for common errors."
        scope="Every client connects to the same workspace MCP server; tokens decide what it can reach."
      />
      {authorized && (
        <Alert>
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertTitle>{authorized} was authorised over OAuth</AlertTitle>
          <AlertDescription>Its next request will carry the grant. You can revoke it from OAuth clients.</AlertDescription>
        </Alert>
      )}
      <PageStateGate
        state={state}
        loading={
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        }
        empty={
          <div className="rounded-lg border">
            <EmptyState
              icon={Plug}
              title="Nothing for a client to reach yet"
              description="AI clients connect to the workspace MCP server, which exposes each knowledge base that has MCP turned on. No knowledge base has MCP on yet."
              action={{ label: "Open knowledge bases", href: `${base}/kb` }}
              secondaryAction={{ label: "MCP server", href: `${base}/connect/mcp` }}
            />
          </div>
        }
      >
        <ClientsGrid />
      </PageStateGate>
    </div>
  )
}
