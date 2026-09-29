"use client"

import { useMock, isAdmin } from "@/lib/mock/store"

export function useRole() {
  const role = useMock((s) => s.role)
  return { role, admin: isAdmin(role), owner: role === "owner" }
}
