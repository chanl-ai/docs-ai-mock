"use client"

import { Suspense } from "react"
import { FormSkeleton } from "@/components/shared/states"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export default function OnboardingPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={3} />}>
      <OnboardingWizard />
    </Suspense>
  )
}
