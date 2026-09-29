"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMock } from "@/lib/mock/store"

function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const login = useMock((s) => s.login)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const exists = params.get("state") === "error"

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n: Record<string, string> = {}
    if (name.trim().length < 1 || name.length > 80) n.name = "Name is 1 to 80 characters"
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) n.email = "Enter a valid email address"
    if (password.length < 8 || !/\d/.test(password)) n.password = "8 or more characters with at least one number"
    if (!terms) n.terms = "Accept the terms to continue"
    setErrs(n)
    if (Object.keys(n).length) return
    setLoading(true)
    setTimeout(() => {
      login(email)
      useMock.setState({ onboardingDone: false, user: { id: "u_new", name, email } })
      router.replace("/onboarding")
    }, 600)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Then set up a workspace and your first knowledge base.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {exists && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                An account with this email exists.{" "}
                <Link href="/login" className="underline underline-offset-4">Sign in instead</Link>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} aria-invalid={!!errs.name} autoComplete="name" />
            {errs.name && <p className="text-xs text-destructive">{errs.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} aria-invalid={!!errs.email} autoComplete="email" />
            {errs.email && <p className="text-xs text-destructive">{errs.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} aria-invalid={!!errs.password} autoComplete="new-password" />
            <p className={errs.password ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{errs.password ?? "8 or more characters with at least one number"}</p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(!!v)} disabled={loading} className="mt-0.5" />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug">
              I agree to the terms of service and privacy policy
            </Label>
          </div>
          {errs.terms && <p className="-mt-2 text-xs text-destructive">{errs.terms}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
