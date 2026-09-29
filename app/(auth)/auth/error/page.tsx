"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const MESSAGES: Record<string, { title: string; body: string }> = {
  provider_denied: { title: "Sign-in was cancelled", body: "The identity provider reported that you declined the request, or it timed out. Nothing was changed on your account." },
  link_expired: { title: "This link has expired", body: "Sign-in and reset links work for 30 minutes. Request a new one from the sign-in page." },
  account_disabled: { title: "This account is disabled", body: "An administrator disabled sign-in for this account. Ask a workspace owner to re-enable it." },
  unknown: { title: "Sign-in did not complete", body: "Something went wrong while finishing sign-in. Trying again usually works." },
}

function AuthErrorContent() {
  const params = useSearchParams()
  const code = params.get("code") ?? "unknown"
  const msg = MESSAGES[code] ?? MESSAGES.unknown
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-in problem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{msg.title}</AlertTitle>
          <AlertDescription>{msg.body}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Try again</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Still stuck? Email <span className="font-mono">support@docs-ai.example</span> with code <span className="font-mono">{code}</span>.
        </p>
      </CardContent>
    </Card>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  )
}
