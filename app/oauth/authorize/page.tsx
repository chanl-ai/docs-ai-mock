"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpenText, ShieldCheck, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMock } from "@/lib/mock/store"

const SCOPE_TEXT: Record<string, string> = {
  "knowledge:read": "Search and read the knowledge bases you can access",
  "knowledge:write": "Propose changes to documents (they go to review)",
  "tools:run": "Run tools on your behalf, asking first when a tool requires it",
  "tools:read": "See which tools exist and what they do",
}

function ConsentContent() {
  const router = useRouter()
  const params = useSearchParams()
  const clientId = params.get("client_id") ?? "dai_client_5kq2m8x1"
  const scope = (params.get("scope") ?? "knowledge:read tools:run").split(/[ ,+]+/).filter(Boolean)
  const state = params.get("state")
  const redirect = params.get("redirect_uri") ?? "https://claude.ai/api/mcp/auth_callback"
  const clients = useMock((s) => s.oauthClients)
  const workspaces = useMock((s) => s.workspaces)
  const hydrated = useMock((s) => s.hydrated)
  const [ws, setWs] = useState(workspaces[0]?.id)
  const client = clients.find((c) => c.clientId === clientId)
  if (!hydrated) return null

  const uriOk = client?.redirectUris.includes(redirect)
  const errorState = params.get("state") === "error" || !client || !uriOk
  const errorMsg = !client ? "Unknown client. The application sent a client id that is not registered in any of your workspaces." : !uriOk ? "Redirect URI mismatch. The application asked to return to an address its registration does not allow." : "Unsupported scope."

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpenText className="size-3.5" />
          </span>
          Docs AI
        </div>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-muted-foreground" />
          {client?.name ?? "Unknown application"}
        </CardTitle>
        <CardDescription>wants to access {workspaces.find((w) => w.id === ws)?.name ?? "your workspace"} on your behalf.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorState ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>This request cannot be approved</AlertTitle>
            <AlertDescription>{errorMsg} Close this window and contact the application's developer.</AlertDescription>
          </Alert>
        ) : (
          <>
            {workspaces.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Workspace</span>
                <Select value={ws} onValueChange={setWs}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">This application will be able to</span>
              <ul className="divide-y rounded-md border">
                {scope.map((s) => {
                  const allowed = client.allowedScopes.includes(s)
                  return (
                    <li key={s} className="flex items-start gap-3 px-3 py-2 text-sm">
                      <Badge variant="outline" className={`mt-0.5 font-mono text-[11px] ${allowed ? "" : "line-through opacity-60"}`}>{s}</Badge>
                      <span className={allowed ? "" : "text-muted-foreground line-through"}>{SCOPE_TEXT[s] ?? s}</span>
                    </li>
                  )
                })}
              </ul>
              {scope.some((s) => !client.allowedScopes.includes(s)) && <p className="text-xs text-muted-foreground">Struck-through scopes are not allowed for this application and will be dropped.</p>}
            </div>
            <p className="text-xs text-muted-foreground">You will be returned to <span className="font-mono">{new URL(redirect).host}</span>. Document permissions still apply: the application only sees what you can see.</p>
          </>
        )}
      </CardContent>
      {!errorState && (
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/w/northwind/connect/oauth-clients?denied=1${state ? `&state=${state}` : ""}`)}>Deny</Button>
          <Button onClick={() => router.push(`/w/northwind/connect/clients?authorized=${client.name}`)}>Allow</Button>
        </CardFooter>
      )}
    </Card>
  )
}

export default function OAuthAuthorizePage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Suspense fallback={null}>
        <ConsentContent />
      </Suspense>
    </div>
  )
}
