"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWs } from "@/lib/mock/hooks"
import { FormSkeleton } from "@/components/shared/states"

export default function SettingsIndex() {
  const router = useRouter()
  const { base } = useWs()
  useEffect(() => router.replace(`${base}/settings/general`), [router, base])
  return <FormSkeleton />
}
