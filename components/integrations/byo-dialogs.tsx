"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMock } from "@/lib/mock/store"

export function McpServerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [auth, setAuth] = useState("bearer")
  const [token, setToken] = useState("")
  useEffect(() => { if (open) { setName(""); setUrl(""); setAuth("bearer"); setToken("") } }, [open])
  const urlOk = /^https:\/\//.test(url)
  const ok = name.trim().length >= 2 && urlOk && (auth === "none" || !!token)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an MCP server</DialogTitle>
          <DialogDescription>Its tools are listed when you save and show up under Tools, off until you enable them.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Payments ops server" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-url">Server URL</Label>
            <Input id="mcp-url" className="font-mono text-xs md:text-xs" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" aria-invalid={!!url && !urlOk} />
            {url && !urlOk && <p className="text-xs text-destructive">Use an https:// URL; plain HTTP is refused.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Auth</Label>
            <Select value={auth} onValueChange={setAuth}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer token</SelectItem>
                <SelectItem value="header">Custom header</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {auth !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="mcp-token">Token</Label>
              <Input id="mcp-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!ok} onClick={() => { toast.success("Server saved", { description: "Tools load on save. They appear under Tools once listed." }); onOpenChange(false) }}>Save server</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Any other API: the token becomes a workspace secret that REST tools reference by name. */
export function ApiTokenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const secrets = useMock((s) => s.secrets)
  const createSecret = useMock((s) => s.createSecret)
  const [app, setApp] = useState("")
  const [token, setToken] = useState("")
  useEffect(() => { if (open) { setApp(""); setToken("") } }, [open])
  const name = `${app.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}_TOKEN`
  const clash = secrets.some((s) => s.name === name)
  const ok = /^[A-Z]/.test(name) && app.trim().length >= 2 && !!token && !clash
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an API key or token</DialogTitle>
          <DialogDescription>For an app that is not in the catalogue. The token is stored as a secret; call the API from a REST tool.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="byo-app">App name</Label>
            <Input id="byo-app" value={app} onChange={(e) => setApp(e.target.value)} placeholder="Loan origination" />
            <p className="text-xs text-muted-foreground">Saved as <span className="font-mono">{`{{secret.${app ? name : "APP_TOKEN"}}}`}</span>{clash && <span className="text-destructive"> — already exists</span>}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="byo-token">Token</Label>
            <Input id="byo-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!ok} onClick={() => { createSecret({ name, type: "bearer", description: `Token for ${app.trim()}`, isActive: true, tags: ["integration"] }); toast.success("Saved as a secret", { description: `Reference it as {{secret.${name}}} in a REST tool` }); onOpenChange(false) }}>Save token</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
