"use client"

import { createContext, useContext } from "react"
import type { Tool } from "@/lib/mock/types"

export interface ToolDraftValue {
  saved: Tool
  draft: Tool
  setDraft: (next: Tool | ((t: Tool) => Tool)) => void
  patch: (p: Partial<Tool>) => void
  dirty: boolean
  save: () => void
  readOnly: boolean
  canTest: boolean
}

export const ToolDraftContext = createContext<ToolDraftValue | null>(null)

/** Shared draft of the tool being edited: every tab reads and writes the same copy until Save. */
export function useToolDraft() {
  const v = useContext(ToolDraftContext)
  if (!v) throw new Error("useToolDraft must be used inside the tool layout")
  return v
}
