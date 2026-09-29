"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMock } from "@/lib/mock/store"
import { DashboardSkeleton } from "@/components/shell/dashboard-skeleton"

export default function RootPage() {
  const router = useRouter()
  const hydrated = useMock((s) => s.hydrated)
  const authed = useMock((s) => s.authed)
  const slug = useMock((s) => s.lastWorkspaceSlug)
  useEffect(() => {
    if (!hydrated) return
    router.replace(authed ? `/w/${slug}` : "/login")
  }, [hydrated, authed, slug, router])
  return <DashboardSkeleton />
}
