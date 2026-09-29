"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Ban } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TagInput } from "@/components/shared/tag-input"
import { CopyButton } from "@/components/shared/copy"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import type { Secret } from "@/lib/mock/types"

export const secretTypeLabel: Record<Secret["type"], string> = { api_key: "API key", bearer: "Bearer", basic: "Basic", custom: "Custom" }
const NAME_RE = /^[A-Z][A-Z0-9_]{1,63}$/

export function SecretDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Secret }) {
  const secrets = useMock((s) => s.secrets)
  const createSecret = useMock((s) => s.createSecret)
  const updateSecret = useMock((s) => s.updateSecret)
  const [name, setName] = useState("")
  const [type, setType] = useState<Secret["type"]>("api_key")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [expires, setExpires] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? "")
    setType(editing?.type ?? "api_key")
    setValue("")
    setDescription(editing?.description ?? "")
    setTags(editing?.tags ?? [])
    setExpires(editing?.expiresAt?.slice(0, 10) ?? "")
    setMaxUses(editing?.maxUses ? String(editing.maxUses) : "")
    setTouched(false)
  }, [open, editing])

  const nameError = !NAME_RE.test(name) ? "Upper case letters, digits and underscores; starts with a letter; 2 to 64 characters" : secrets.some((s) => s.name === name && s.id !== editing?.id) ? "A secret with this name already exists" : null
  const valueError = !editing && !value ? "Enter the secret value" : null
  const locked = !!editing && (editing.usedByToolIds.length > 0 || editing.usedBySourceIds.length > 0)

  const submit = () => {
    setTouched(true)
    if (nameError || valueError) return
    const meta = { name, type, description, tags, expiresAt: expires ? new Date(expires).toISOString() : undefined, maxUses: maxUses ? Number(maxUses) : undefined }
    if (editing) {
      updateSecret(editing.id, meta)
      toast.success("Secret updated", { description: name })
    } else {
      createSecret({ ...meta, isActive: true })
      toast.success("Secret created", { description: `Reference it as {{secret.${name}}}` })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "New secret"}</DialogTitle>
          <DialogDescription>{editing ? "Change the metadata. Use Rotate value to replace the value itself." : "Stored encrypted. The value is never shown again after you save."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sec-name">Name</Label>
            <Input id="sec-name" className="font-mono text-xs md:text-xs" value={name} disabled={locked} onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} onBlur={() => setTouched(true)} placeholder="CORE_BANKING_TOKEN" aria-invalid={touched && !!nameError} />
            {touched && nameError ? (
              <p className="text-xs text-destructive">{nameError}</p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                Reference: <span className="font-mono">{`{{secret.${name || "NAME"}}}`}</span>
                {name && <CopyButton text={`{{secret.${name}}}`} iconOnly variant="ghost" className="size-6" />}
              </p>
            )}
            {locked && <p className="text-xs text-muted-foreground">The name is locked while tools or sources reference it.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Secret["type"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(secretTypeLabel) as Secret["type"][]).map((t) => <SelectItem key={t} value={t}>{secretTypeLabel[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="sec-value">Value</Label>
                <Input id="sec-value" type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={touched && !!valueError} />
                {touched && valueError && <p className="text-xs text-destructive">{valueError}</p>}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-desc">Description</Label>
            <Textarea id="sec-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it unlocks and who issued it" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-tags">Tags</Label>
            <TagInput id="sec-tags" value={tags} onChange={setTags} placeholder="Add a tag…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sec-exp">Expires</Label>
              <Input id="sec-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
              <p className="text-xs text-muted-foreground">Expired secrets turn inactive and calls using them fail.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-max">Max uses</Label>
              <Input id="sec-max" type="number" min={1} className="tabular-nums" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Create secret"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RotateDialog({ secret, onOpenChange }: { secret?: Secret; onOpenChange: (o: boolean) => void }) {
  const rotateSecret = useMock((s) => s.rotateSecret)
  const [value, setValue] = useState("")
  useEffect(() => setValue(""), [secret])
  return (
    <Dialog open={!!secret} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rotate {secret?.name}</DialogTitle>
          <DialogDescription>The new value replaces the old one immediately. Tools and sources pick it up on their next call; nothing else changes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rot-value">New value</Label>
          <Input id="rot-value" type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!value} onClick={() => { if (secret) { rotateSecret(secret.id); toast.success("Value rotated", { description: secret.name }) } onOpenChange(false) }}>Rotate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Shown instead of a delete confirm while the secret is referenced; the server refuses with 409 in that case. */
export function BlockedDeleteDialog({ secret, onOpenChange }: { secret?: Secret; onOpenChange: (o: boolean) => void }) {
  const { base } = useWs()
  const tools = useMock((s) => s.tools)
  const sources = useMock((s) => s.sources)
  const toolRefs = secret ? tools.filter((t) => secret.usedByToolIds.includes(t.id)) : []
  const sourceRefs = secret ? sources.filter((s) => secret.usedBySourceIds.includes(s.id)) : []
  return (
    <AlertDialog open={!!secret} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><Ban className="size-4 text-destructive" /> {secret?.name} cannot be deleted yet</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>It is still referenced. Point these at another secret or remove the reference, then delete it. Deactivating it stops every call now without deleting it.</p>
              <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                {toolRefs.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">{toolRefs.length} tool{toolRefs.length === 1 ? "" : "s"}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {toolRefs.map((t) => <li key={t.id}><Link href={`${base}/tools/${t.id}/${t.type}`} className="underline-offset-4 hover:underline">{t.name}</Link></li>)}
                    </ul>
                  </div>
                )}
                {sourceRefs.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">{sourceRefs.length} source{sourceRefs.length === 1 ? "" : "s"}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {sourceRefs.map((s) => <li key={s.id}><Link href={`${base}/sources/${s.id}/settings`} className="underline-offset-4 hover:underline">{s.name}</Link></li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <Button variant="destructive" disabled>Delete</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
