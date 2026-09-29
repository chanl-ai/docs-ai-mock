"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { SiteHeader } from "@/components/shell/site-header"
import { DashboardSkeleton } from "@/components/shell/dashboard-skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useMock } from "@/lib/mock/store"

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hydrated = useMock((s) => s.hydrated)
  const authed = useMock((s) => s.authed)

  useEffect(() => {
    if (hydrated && !authed) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`)
  }, [hydrated, authed, router])

  if (!hydrated || !authed) return <DashboardSkeleton />

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 62)",
          "--sidebar-width-icon": "calc(var(--spacing) * 12)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="@container/main flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
