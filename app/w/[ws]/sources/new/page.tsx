"use client"

import { Suspense } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { AdminOnly } from "@/components/shared/role-gate"
import { AddSourceWizard } from "@/components/sources/add-source-wizard"

export default function NewSourcePage() {
  return (
    <AdminOnly>
      <div className="flex flex-col gap-5">
        <PageHeader title="Add source" description="Configure an intake end to end: what to fetch, how to prepare it, what to keep, and when to refresh." />
        <Suspense fallback={null}>
          <AddSourceWizard mode="page" />
        </Suspense>
      </div>
    </AdminOnly>
  )
}
