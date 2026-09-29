"use client"

import { useParams } from "next/navigation"
import { useMock } from "./store"

/** Workspace slug from the route and the base path every in-app link starts from. */
export function useWs() {
  const params = useParams<{ ws?: string }>()
  const slug = params?.ws ?? "northwind"
  const workspace = useMock((s) => s.workspaces.find((w) => w.slug === slug) ?? s.workspaces[0])
  return { slug, base: `/w/${slug}`, workspace }
}

export function useHydrated() {
  return useMock((s) => s.hydrated)
}
