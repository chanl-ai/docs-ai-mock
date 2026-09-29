"use client"

import { useState } from "react"
import { AlertTriangle, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CopyableField } from "@/components/shared/copy"
import { useMock } from "@/lib/mock/store"
import type { OAuthClient } from "@/lib/mock/types"
import { SCOPES } from "./connect-helpers"

function uriError(u: string): string | null {
  try {
    const url = new URL(u)
    if (url.protocol === "https:") return null
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return null
    return "Must be https, or http on localhost"
  } catch {
    return "Not a valid URL"
  }
}

/** Shows a client secret once with the "I stored it" gate. Used after create and after rotate. */
export function SecretOnceDialog({ open, onOpenChange, title, clientId, secret }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; clientId: string; secret?: string }) {
  const [stored, setStored] = useState(false)
  const needsConfirm = !!secret
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && needsConfirm && !stored) return; if (!o) setStored(false); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{secret ? "Copy the secret into the application's OAuth settings now." : "Public clients use PKCE and have no secret."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <CopyableField label="Client id" value={clientId} />
          {secret && (
            <>
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>This is the only time the secret is shown.</AlertDescription>
              </Alert>
              <CopyableField label="Client secret" value={secret} />
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={stored} onCheckedChange={(v) => setStored(!!v)} /> I stored it</label>
            </>
          )}
        </div>
        <DialogFooter>
          <Button disabled={needsConfirm && !stored} onClick={() => { setStored(false); onOpenChange(false) }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OAuthClientDialog({ open, onOpenChange, editing, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: OAuthClient; onCreated?: (client: OAuthClient, secret?: string) => void }) {
  const createOAuthClient = useMock((s) => s.createOAuthClient)
  const updateOAuthClient = useMock((s) => s.updateOAuthClient)
  const [name, setName] = useState(editing?.name ?? "")
  const [uris, setUris] = useState<string[]>(editing?.redirectUris ?? [""])
  const [scopes, setScopes] = useState<string[]>(editing?.allowedScopes ?? ["knowledge:read"])
  const [type, setType] = useState<OAuthClient["clientType"]>(editing?.clientType ?? "public")
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const cleaned = uris.map((u) => u.trim()).filter(Boolean)
  const dup = new Set(cleaned).size !== cleaned.length

  const submit = () => {
    setTouched(true)
    if (name.trim().length < 2) return setError("Name is at least 2 characters")
    if (!cleaned.length) return setError("Add at least one redirect URI")
    if (cleaned.some((u) => uriError(u))) return setError("Fix the redirect URIs marked above")
    if (dup) return setError("Redirect URIs must be unique")
    if (!scopes.length) return setError("Pick at least one scope")
    setError(null)
    if (editing) {
      updateOAuthClient(editing.id, { name: name.trim(), redirectUris: cleaned, allowedScopes: scopes })
      toast.success("OAuth client updated", { description: name.trim() })
      onOpenChange(false)
    } else {
      const res = createOAuthClient({ name: name.trim(), redirectUris: cleaned, allowedScopes: scopes, clientType: type })
      toast.success("OAuth client registered", { description: res.client.name })
      onOpenChange(false)
      onCreated?.(res.client, res.secret)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4">
          <DialogTitle>{editing ? `Edit ${editing.name}` : "Register OAuth client"}</DialogTitle>
          <DialogDescription>An OAuth client signs each user in and acts with that user's access, instead of sharing one token.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <Label htmlFor="oc-name">Client name</Label>
            <Input id="oc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Internal agent portal" autoFocus />
            <p className="text-xs text-muted-foreground">Shown to users on the consent screen.</p>
          </div>
          <div className="space-y-2">
            <Label>Redirect URIs</Label>
            {uris.map((u, i) => {
              const err = touched && u.trim() ? uriError(u.trim()) : null
              return (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2">
                    <Input value={u} onChange={(e) => setUris((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://app.example.com/oauth/callback" className="font-mono text-xs" aria-invalid={!!err} aria-label={`Redirect URI ${i + 1}`} />
                    <Button variant="ghost" size="icon" className="shrink-0" disabled={uris.length === 1} onClick={() => setUris((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove redirect URI ${i + 1}`}><X className="size-4" /></Button>
                  </div>
                  {err && <p className="text-xs text-destructive">{err}</p>}
                </div>
              )
            })}
            <Button variant="outline" size="sm" onClick={() => setUris((cur) => [...cur, ""])}><Plus className="size-3.5" /> Add URI</Button>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Allowed scopes</legend>
            {SCOPES.map((s) => (
              <label key={s.id} className="flex items-start gap-2">
                <Checkbox className="mt-0.5" checked={scopes.includes(s.id)} onCheckedChange={(v) => setScopes((cur) => (v ? [...cur, s.id] : cur.filter((x) => x !== s.id)))} />
                <span><span className="font-mono text-xs">{s.id}</span><span className="block text-xs text-muted-foreground">{s.description}</span></span>
              </label>
            ))}
          </fieldset>
          {!editing && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Client type</legend>
              <RadioGroup value={type} onValueChange={(v) => setType(v as OAuthClient["clientType"])} className="space-y-2">
                <label className="flex items-start gap-2"><RadioGroupItem value="public" className="mt-0.5" /><span className="text-sm">Public (PKCE)<span className="block text-xs text-muted-foreground">Desktop and browser apps that cannot keep a secret.</span></span></label>
                <label className="flex items-start gap-2"><RadioGroupItem value="confidential" className="mt-0.5" /><span className="text-sm">Confidential<span className="block text-xs text-muted-foreground">Server-side apps; gets a client secret.</span></span></label>
              </RadioGroup>
            </fieldset>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Register"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
