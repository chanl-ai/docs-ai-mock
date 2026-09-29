"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpenText, Building2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMock } from "@/lib/mock/store"
import { Section, Rows, Row } from "@/components/shared/surface"
import { EmptyState, ErrorState } from "@/components/shared/states"
import { relative } from "@/lib/format"

function WorkspacesContent() {
  const router = useRouter()
  const params = useSearchParams()
  const state = params.get("state")
  const workspaces = useMock((s) => s.workspaces)
  const invitations = useMock((s) => s.invitations)
  const cancelInvitation = useMock((s) => s.cancelInvitation)
  const hydrated = useMock((s) => s.hydrated)
  if (!hydrated) return null

  const list = state === "empty" ? [] : workspaces
  const pending = state === "empty" ? [] : invitations.filter((i) => i.status === "pending")

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookOpenText className="size-4" />
        </span>
        Docs AI
      </div>
      {state === "error" ? (
        <ErrorState title="Could not load your workspaces" message="The request timed out. Your session is still valid." onRetry={() => router.refresh()} />
      ) : (
        <>
          <Section title="Choose a workspace" actions={<Button size="sm" variant="outline" onClick={() => router.push("/onboarding")}><Plus className="size-3.5" /> Create workspace</Button>} flush>
            {list.length === 0 ? (
              <EmptyState icon={Building2} title="You are not in a workspace yet" description="A workspace holds a team's sources, knowledge bases and tools. Create one, or wait for an invitation, which arrives by email." action={{ label: "Create workspace", href: "/onboarding" }} />
            ) : (
              <Rows>
                {list.map((w) => (
                  <Row
                    key={w.id}
                    leading={<div className="flex size-9 items-center justify-center rounded-md border text-sm font-medium">{w.name[0]}</div>}
                    title={w.name}
                    description={<span className="font-mono">/{w.slug}</span>}
                    trailing={
                      <>
                        <Badge variant="secondary" className="font-normal capitalize">{w.role}</Badge>
                        <span className="text-xs text-muted-foreground">{w.memberCount} member{w.memberCount === 1 ? "" : "s"}</span>
                      </>
                    }
                    onClick={() => { useMock.setState({ lastWorkspaceSlug: w.slug }); router.push(`/w/${w.slug}`) }}
                  />
                ))}
              </Rows>
            )}
          </Section>
          {pending.length > 0 && (
            <Section title="Pending invitations" flush>
              <Rows>
                {pending.map((i) => (
                  <Row
                    key={i.id}
                    title={i.email.split("@")[1]?.split(".")[0] ?? i.email}
                    description={`Invited by ${i.invitedBy} · ${relative(i.sentAt)}`}
                    trailing={
                      <>
                        <Button size="sm" variant="outline" onClick={() => { cancelInvitation(i.id); toast.message("Invitation declined") }}>Decline</Button>
                        <Button size="sm" onClick={() => { cancelInvitation(i.id); toast.success("Invitation accepted"); router.push("/w/northwind") }}>Accept</Button>
                      </>
                    }
                  />
                ))}
              </Rows>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

export default function WorkspacesPage() {
  return (
    <div className="flex min-h-svh items-start justify-center bg-muted/30 px-4 py-12">
      <Suspense fallback={null}>
        <WorkspacesContent />
      </Suspense>
    </div>
  )
}
