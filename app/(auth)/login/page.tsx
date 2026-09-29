"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMock } from "@/lib/mock/store"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const state = params.get("state")
  const next = params.get("next")
  const login = useMock((s) => s.login)
  const authed = useMock((s) => s.authed)
  const hydrated = useMock((s) => s.hydrated)
  const slug = useMock((s) => s.lastWorkspaceSlug)
  const onboardingDone = useMock((s) => s.onboardingDone)
  const [email, setEmail] = useState("priya@northwind.example")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(state === "loading")
  const [error, setError] = useState<string | null>(state === "error" ? "Wrong email or password. Passwords are case sensitive; use Forgot password if you are unsure." : null)
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({})

  useEffect(() => {
    if (!hydrated) return
    // ?autologin=1 lets screenshot tooling reach the app without a form submit.
    if (params.get("autologin") === "1" && !authed) {
      login("priya@northwind.example")
      return
    }
    if (authed && !state) router.replace(next || `/w/${slug}`)
  }, [hydrated, authed, next, slug, router, state, params, login])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof fieldErr = {}
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Enter a valid email address"
    if (!password) errs.password = "Enter your password"
    setFieldErr(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    setError(null)
    setTimeout(() => {
      login(email)
      router.replace(next || (onboardingDone ? `/w/${slug}` : "/onboarding"))
    }, 600)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Any email and password work in this mock.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} aria-invalid={!!fieldErr.email} autoComplete="email" />
            {fieldErr.email && <p className="text-xs text-destructive">{fieldErr.email}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} aria-invalid={!!fieldErr.password} autoComplete="current-password" />
            {fieldErr.password && <p className="text-xs text-destructive">{fieldErr.password}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
          <div className="relative py-1">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
          </div>
          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => { setLoading(true); setTimeout(() => { login("priya@northwind.example"); router.replace(next || `/w/${slug}`) }, 600) }}>
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.4-5.35 4.4-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 4.1 14.55 3.2 12 3.2 7.1 3.2 3.15 7.15 3.15 12s3.95 8.8 8.85 8.8c5.1 0 8.5-3.6 8.5-8.65 0-.6-.05-1.05-.15-1.05Z" /></svg>
            Continue with Google
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
