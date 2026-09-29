"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Database, Loader2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CopyableField } from "@/components/shared/copy"
import { Rows, Row } from "@/components/shared/surface"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import type { Integration } from "@/lib/mock/types"

function prerequisites(i: Integration): string[] {
  if (i.authMethod === "certificate") return ["Admin consent granted in the tenant", "Sites.Read.All", "Files.Read.All", "Certificate uploaded to the app registration"]
  if (i.authMethod === "api_key") return [`API access enabled in ${i.name}`, "A token from an account with read access"]
  return [`An ${i.name} account that can approve apps`, "Pop-ups allowed for this site"]
}

function apiFields(i: Integration): { id: string; label: string; placeholder: string; secret?: boolean }[] {
  switch (i.type) {
    case "zendesk":
      return [{ id: "subdomain", label: "Subdomain", placeholder: "northwind" }, { id: "email", label: "Agent email", placeholder: "ops@northwind.example" }, { id: "token", label: "API token", placeholder: "", secret: true }]
    case "twilio":
      return [{ id: "sid", label: "Account SID", placeholder: "AC…" }, { id: "token", label: "Auth token", placeholder: "", secret: true }]
    case "airtable":
      return [{ id: "base", label: "Base id", placeholder: "app…" }, { id: "token", label: "Personal access token", placeholder: "", secret: true }]
    default:
      return [{ id: "token", label: "API key", placeholder: "", secret: true }]
  }
}

export function ConnectDialog({ integration, onOpenChange, onEnableTools }: { integration?: Integration; onOpenChange: (o: boolean) => void; onEnableTools: (id: string) => void }) {
  const router = useRouter()
  const { base, slug } = useWs()
  const connect = useMock((s) => s.connectIntegration)
  const [step, setStep] = useState<"connect" | "next">("connect")
  const [busy, setBusy] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [cert, setCert] = useState("")
  const [tenant, setTenant] = useState("")

  useEffect(() => { setStep("connect"); setBusy(false); setFields({}); setCert(""); setTenant("") }, [integration?.id])

  if (!integration) return null
  const i = integration
  const specs = apiFields(i)
  const formOk = i.authMethod === "oauth" || (i.authMethod === "api_key" ? specs.every((f) => fields[f.id]?.trim()) : !!cert && !!tenant.trim())

  const go = () => {
    setBusy(true)
    setTimeout(() => {
      const account =
        i.authMethod === "oauth" ? "ops@northwind.example" : i.authMethod === "certificate" ? `${tenant.trim()} (app-only)` : fields.subdomain ? `${fields.subdomain}.${i.type}.com` : `key ending ${(fields.token ?? "").slice(-4) || "0000"}`
      connect(i.id, account)
      setBusy(false)
      setStep("next")
      toast.success(`${i.name} connected`, { description: account })
    }, 1000)
  }

  return (
    <Dialog open={!!integration} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {step === "connect" ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect {i.name}</DialogTitle>
              <DialogDescription>
                {i.authMethod === "oauth"
                  ? `You approve access in ${i.name}. The connection is shared by the whole workspace; every source and tool that uses ${i.name} reuses it.`
                  : i.authMethod === "certificate"
                    ? "App-only access with a certificate. No user signs in; the tenant admin grants the app read access once."
                    : `Paste the credentials ${i.name} gives you. They are stored encrypted and never shown again.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Prerequisites</p>
              <Rows className="rounded-md border">
                {prerequisites(i).map((p) => (
                  <Row key={p} className="py-1.5" leading={<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Met" />} title={<span className="font-normal">{p}</span>} />
                ))}
              </Rows>
            </div>

            {i.authMethod === "api_key" && (
              <div className="grid gap-3">
                {specs.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <Label htmlFor={`f-${f.id}`}>{f.label}</Label>
                    <Input id={`f-${f.id}`} type={f.secret ? "password" : "text"} autoComplete="off" placeholder={f.placeholder} value={fields[f.id] ?? ""} onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })} />
                  </div>
                ))}
              </div>
            )}

            {i.authMethod === "certificate" && (
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant">Tenant domain</Label>
                  <Input id="tenant" className="font-mono text-xs md:text-xs" placeholder="northwind.sharepoint.com" value={tenant} onChange={(e) => setTenant(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cert" className="flex items-center gap-1">
                    Certificate (.pfx or .pem)
                    <Tooltip>
                      <TooltipTrigger asChild><span className="cursor-help text-xs text-muted-foreground underline decoration-dotted">tenant admin consent</span></TooltipTrigger>
                      <TooltipContent className="max-w-xs">A Global or SharePoint admin must approve the app registration once. Until then the connection is refused with a consent error.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input id="cert" type="file" accept=".pfx,.pem,.cer" onChange={(e) => setCert(e.target.files?.[0]?.name ?? "")} />
                  <p className="text-xs text-muted-foreground">The certificate must belong to the app registration your tenant admin consented to.</p>
                </div>
              </div>
            )}

            {i.authMethod === "oauth" && (
              <CopyableField label="If the popup is blocked, open this link in a new tab" value={`https://auth.docsai.example/oauth/${i.type}/start?ws=${slug}`} />
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={go} disabled={busy || !formOk}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {i.authMethod === "oauth" ? `Continue with ${i.name}` : "Connect"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" /> {i.name} is connected</DialogTitle>
              <DialogDescription>Choose what to use it for. You can do either later from this page.</DialogDescription>
            </DialogHeader>
            <Rows className="rounded-md border">
              {i.knowledge && (
                <Row
                  leading={<Database className="size-4 text-muted-foreground" />}
                  title="Add as knowledge source"
                  description={`Index ${i.name} content so assistants can answer from it.`}
                  trailing={<Button size="sm" onClick={() => { onOpenChange(false); router.push(`${base}/sources/new?type=${i.type}`) }}>Add source</Button>}
                />
              )}
              {i.tools && (
                <Row
                  leading={<Wrench className="size-4 text-muted-foreground" />}
                  title="Enable tools"
                  description={`${i.availableTools.length} tools. Reads are on by default; writes stay off until you enable them.`}
                  trailing={<Button size="sm" variant="outline" onClick={() => onEnableTools(i.id)}>Choose tools</Button>}
                />
              )}
            </Rows>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
