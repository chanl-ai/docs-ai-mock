"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr("Enter a valid email address")
      return
    }
    setErr(null)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 500)
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
            <MailCheck className="size-5 text-muted-foreground" />
          </div>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>If that address exists we sent a link. It expires in 30 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter the email you sign in with and we will send a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} aria-invalid={!!err} autoComplete="email" />
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline underline-offset-4">Back to sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}
