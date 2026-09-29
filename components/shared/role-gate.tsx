"use client"

import type { ReactNode } from "react"
import { useParams } from "next/navigation"
import { useRole } from "@/hooks/use-role"
import { PermissionDenied } from "./states"

/** Renders the permission-denied state for Members on admin-only pages. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { admin } = useRole()
  const params = useParams<{ ws: string }>()
  if (!admin) return <PermissionDenied ws={params.ws} />
  return <>{children}</>
}
