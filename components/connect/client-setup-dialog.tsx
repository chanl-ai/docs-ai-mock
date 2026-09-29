"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, CircleDashed, Info, KeyRound, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CodeBlock } from "@/components/shared/code-sample"
import { CopyButton, CopyableField } from "@/components/shared/copy"
import { StatusBadge } from "@/components/shared/status-badge"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { CreateTokenDialog } from "./create-token-dialog"
import { TOKEN_PLACEHOLDER, clientSnippet, clientSteps, mcpHttpUrl, type AuthMethod, type ClientDef } from "./connect-helpers"

export function ClientAvatar({ name }: { name: string }) {
  return <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">{name.charAt(0)}</span>
}

export function ClientSeenBadge({ client }: { client: ClientDef }) {
  return client.seen ? <StatusBadge tone="good" icon={CheckCircle2} label="Connected" /> : <StatusBadge tone="neutral" icon={CircleDashed} label="Not seen" />
}

export function ClientSetupDialog({ client, slug, base, open, onOpenChange }: { client: ClientDef; slug: string; base: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { admin } = useRole()
  const membersCanCreate = useMock((s) => s.settings.security.membersCanCreateTokens)
  const canCreate = admin || membersCanCreate
  const [auth, setAuth] = useState<AuthMethod>(client.oauthOnly ? "oauth" : "token")
  const [secret, setSecret] = useState<string | null>(null)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [showFile, setShowFile] = useState(false)
  const [ping, setPing] = useState<"idle" | "waiting" | "seen" | "unseen">("idle")

  const snippet = clientSnippet(client.id, slug, auth, secret ?? TOKEN_PLACEHOLDER)
  const steps = clientSteps(client.id, auth)

  const sendPing = () => {
    setPing("waiting")
    setTimeout(() => setPing(client.seen ? "seen" : "unseen"), 2000)
  }

  const troubles = [
    { id: "401", title: "401 Unauthorized: token invalid or expired", fix: "Create a new token and replace the old one in the client config, then restart the client.", href: `${base}/connect/mcp`, link: "Open tokens" },
    { id: "403", title: "403 Forbidden: scope missing", fix: "The token lacks the scope the call needs (for example tools:run). Create a token with that scope.", href: `${base}/connect/mcp`, link: "Open tokens" },
    { id: "reach", title: "The client cannot reach the URL", fix: "Check the URL ends in /mcp and that your network allows outbound HTTPS to mcp.docs-ai.example.", href: `${base}/connect/mcp`, link: "Check server health" },
    { id: "empty", title: "The tools list is empty", fix: "No knowledge base has MCP enabled. Turn it on from a knowledge base's Access tab.", href: `${base}/kb`, link: "Open knowledge bases" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <ClientAvatar name={client.name} />
            <div className="min-w-0 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2">{client.name} <ClientSeenBadge client={client} /></DialogTitle>
              <DialogDescription>{client.blurb}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Tabs defaultValue="setup" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b px-4 py-2">
            <TabsList>
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="verify">Verify</TabsTrigger>
              <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <TabsContent value="setup" className="mt-0 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label>Auth method</Label>
                  <Select value={auth} onValueChange={(v) => setAuth(v as AuthMethod)}>
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token" disabled={client.oauthOnly}>MCP token</SelectItem>
                      <SelectItem value="oauth">Sign in with OAuth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {auth === "token" && canCreate && !secret && (
                  <Button variant="outline" size="sm" onClick={() => setTokenOpen(true)}><KeyRound className="size-3.5" /> Create token</Button>
                )}
              </div>
              {client.oauthOnly && <p className="text-xs text-muted-foreground">ChatGPT connectors sign each user in; a shared token is not supported.</p>}
              {auth === "token" && !canCreate && (
                <Alert>
                  <Info className="size-4" />
                  <AlertDescription>Members cannot create tokens in this workspace. Ask an admin for a token, then replace <span className="font-mono">{TOKEN_PLACEHOLDER}</span> below.</AlertDescription>
                </Alert>
              )}
              {secret && <p className="text-xs text-muted-foreground">Your new token is in the snippet. It will not be shown again after you close this dialog.</p>}
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                {steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <CopyableField label="Server URL (streamable HTTP)" value={mcpHttpUrl(slug)} />
              <CodeBlock code={snippet} />
              <div className="flex flex-wrap gap-2">
                <CopyButton text={snippet} label="Copy config" />
                {client.configFile && <Button variant="outline" size="sm" onClick={() => setShowFile((v) => !v)}>{showFile ? "Hide config file" : "Download config file"}</Button>}
              </div>
              {showFile && client.configFile && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Downloads are blocked in this preview. Save this text as <span className="font-mono">{client.configFile}</span>.</p>
                  <CodeBlock code={snippet} maxHeight={200} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="verify" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">Restart the client after saving the config, then send a ping. We watch for the first request from a {client.name} client.</p>
              <Button onClick={sendPing} disabled={ping === "waiting"}>
                {ping === "waiting" && <Loader2 className="size-4 animate-spin" />}
                {ping === "waiting" ? "Waiting for a request…" : "Send test ping"}
              </Button>
              {ping === "seen" && client.seen && (
                <div className="space-y-1">
                  <StatusBadge tone="good" icon={CheckCircle2} label={`Connected ${client.seen.ago}`} />
                  <p className="font-mono text-xs text-muted-foreground">{client.seen.agent}</p>
                </div>
              )}
              {ping === "unseen" && (
                <div className="space-y-2">
                  <StatusBadge tone="warn" icon={CircleDashed} label="Not seen yet" />
                  <p className="text-sm text-muted-foreground">The client has not sent a request. Check the token and restart the client.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="troubleshoot" className="mt-0">
              <Accordion type="single" collapsible>
                {troubles.map((t) => (
                  <AccordionItem key={t.id} value={t.id}>
                    <AccordionTrigger className="text-sm">{t.title}</AccordionTrigger>
                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                      <p>{t.fix}</p>
                      <Link href={t.href} className="text-foreground underline underline-offset-4" onClick={() => onOpenChange(false)}>{t.link}</Link>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
      <CreateTokenDialog open={tokenOpen} onOpenChange={setTokenOpen} defaults={{ name: `${client.name.split(" ")[0]} client` }} onCreated={(s) => setSecret(s)} />
    </Dialog>
  )
}
