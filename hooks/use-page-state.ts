"use client"

import { useSearchParams } from "next/navigation"

export type PageState = "ready" | "empty" | "loading" | "error"

// Every screen honours ?state=empty|loading|error so reviewers can see each state.
export function usePageState(): PageState {
  const params = useSearchParams()
  const s = params.get("state")
  if (s === "empty" || s === "loading" || s === "error") return s
  return "ready"
}
