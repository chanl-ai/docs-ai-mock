"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CopyableField } from "@/components/shared/copy"
import { TagInput } from "@/components/shared/tag-input"
import { KbDot } from "@/components/knowledge/kb-dot"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import type { McpToken } from "@/lib/mock/types"
import { SCOPES, type McpScope } from "./connect-helpers"

const EXPIRY = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never" },
  { value: "custom", label: "Custom" },
]

export interface CreateTokenDefaults {
  name?: string
  scopes?: McpScope[]
}

export function CreateTokenDialog({ open, onOpenChange, onCreated, defaults }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (secret: string, token: McpToken) => void; defaults?: CreateTokenDefaults }) {
  const { admin } = useRole()
  const kbs = useMock((s) => s.kbs)
  const groups = useMock((s) => s.groups)
  const members = useMock((s) => s.members)
  const requireExpiry = useMock((s) => s.settings.security.requireExpiry)
  const createToken = useMock((s) => s.createToken)

  const [name, setName] = useState(defaults?.name ?? "")
  const [scopes, setScopes] = useState<McpScope[]>(defaults?.scopes ?? ["knowledge:read", "tools:run"])
  const [kbMode, setKbMode] = useState<"all" | "selected">("all")
  const [kbIds, setKbIds] = useState<string[]>([])
  const [principals, setPrincipals] = useState<string[]>(["workspace:*"])
  const [expiry, setExpiry] = useState("90")
  const [customDays, setCustomDays] = useState("14")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ secret: string; token: McpToken } | null>(null)
  const [stored, setStored] = useState(false)

  const reset = () => {
    setName(defaults?.name ?? ""); setScopes(defaults?.scopes ?? ["knowledge:read", "tools:run"]); setKbMode("all"); setKbIds([]); setPrincipals(["workspace:*"])
    setExpiry("90"); setCustomDays("14"); setError(null); setResult(null); setStored(false)
  }

  const close = (o: boolean) => {
    // The secret is shown once; closing before confirming would lose it.
    if (!o && result && !stored) return
    if (!o) reset()
    onOpenChange(o)
  }

  const suggestions = ["workspace:*", ...groups.map((g) => `group:${g.name}`), ...members.map((m) => `user:${m.email}`)]

  const create = () => {
    if (!name.trim()) return setError("Give the token a name so you can tell it apart later")
    if (!scopes.length) return setError("Pick at least one scope")
    if (kbMode === "selected" && !kbIds.length) return setError("Pick at least one knowledge base, or choose All")
    const days = expiry === "never" ? undefined : expiry === "custom" ? Number(customDays) : Number(expiry)
    if (expiry === "custom" && (!Number.isInteger(days) || !days || days < 1 || days > 3650)) return setError("Custom expiry is 1 to 3650 days")
    const res = createToken({ name: name.trim(), scopes, kbIds: kbMode === "all" ? [] : kbIds, principals, expiresInDays: days })
    setError(null)
    setResult(res)
    toast.success("Token created", { description: res.token.name })
    onCreated?.(res.secret, res.token)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4">
          <DialogTitle>{result ? "Token created" : "Create MCP token"}</DialogTitle>
          <DialogDescription>{result ? "Copy it into your client now." : "A token lets an AI client reach this workspace's MCP server with the scopes you pick."}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {result ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>This is the only time the token is shown. Store it in your client or a password manager before closing.</AlertDescription>
              </Alert>
              <CopyableField label={result.token.name} value={result.secret} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={stored} onCheckedChange={(v) => setStored(!!v)} /> I stored it
              </label>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="tok-name">Name</Label>
                <Input id="tok-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya · Claude desktop" autoFocus />
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">Scopes</legend>
                {SCOPES.map((s) => {
                  const locked = s.id === "knowledge:write" && !admin
                  return (
                    <label key={s.id} className={`flex items-start gap-2 ${locked ? "opacity-50" : ""}`}>
                      <Checkbox className="mt-0.5" disabled={locked} checked={scopes.includes(s.id)} onCheckedChange={(v) => setScopes((cur) => (v ? [...cur, s.id] : cur.filter((x) => x !== s.id)))} />
                      <span className="min-w-0">
                        <span className="font-mono text-xs">{s.id}</span>
                        <span className="block text-xs text-muted-foreground">{locked ? "Only admins can grant write access." : s.description}</span>
                      </span>
                    </label>
                  )
                })}
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">Knowledge bases</legend>
                <RadioGroup value={kbMode} onValueChange={(v) => setKbMode(v as typeof kbMode)} className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="all" /> All</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="selected" /> Selected</label>
                </RadioGroup>
                {kbMode === "selected" && (
                  <div className="divide-y rounded-md border">
                    {kbs.map((k) => (
                      <label key={k.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <Checkbox checked={kbIds.includes(k.id)} onCheckedChange={(v) => setKbIds((cur) => (v ? [...cur, k.id] : cur.filter((x) => x !== k.id)))} />
                        <KbDot color={k.color} />
                        <span className="truncate">{k.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <div className="space-y-1.5">
                <Label>Principals for document permissions</Label>
                <TagInput value={principals} onChange={setPrincipals} suggestions={suggestions} placeholder="user:… or group:…" />
                <p className="text-xs text-muted-foreground">Results are filtered to documents these principals may read. <span className="font-mono">workspace:*</span> means any member.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Expiry</Label>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPIRY.map((e) => (
                        <SelectItem key={e.value} value={e.value} disabled={e.value === "never" && requireExpiry}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {requireExpiry && <p className="text-xs text-muted-foreground">Workspace policy requires an expiry.</p>}
                </div>
                {expiry === "custom" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tok-days">Days</Label>
                    <Input id="tok-days" type="number" min={1} max={3650} value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>
        <DialogFooter className="border-t p-4">
          {result ? (
            <Button disabled={!stored} onClick={() => { reset(); onOpenChange(false) }}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button onClick={create}>Create token</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
