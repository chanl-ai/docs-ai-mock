"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { X, Plus, AlertTriangle, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Section } from "@/components/shared/surface"
import { CopyableField } from "@/components/shared/copy"
import { TagInput } from "@/components/shared/tag-input"
import { ConfirmDialog } from "@/components/shared/dialogs"
import { PageStateGate, FormSkeleton } from "@/components/shared/states"
import { AdminOnly } from "@/components/shared/role-gate"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { relative, shortDate } from "@/lib/format"
import { getAvatarInitials, getAvatarColor } from "@/lib/utils/avatar"
import type { KbAccess } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

export default function KbAccessPage() {
  const state = usePageState()
  const params = useParams<{ kbId: string }>()
  const { base } = useWs()
  const kb = useMock((s) => s.kbs.find((k) => k.id === params.kbId))!
  const members = useMock((s) => s.members)
  const groups = useMock((s) => s.groups)
  const apiKeys = useMock((s) => s.apiKeys)
  const sources = useMock((s) => s.sources.filter((x) => kb.sources.some((l) => l.sourceId === x.id)))
  const items = useMock((s) => s.items)
  const kbs = useMock((s) => s.kbs)
  const updateKb = useMock((s) => s.updateKb)
  const revokeApiKey = useMock((s) => s.revokeApiKey)
  const [a, setA] = useState<KbAccess>(kb.access)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [principalsFor, setPrincipalsFor] = useState<string | null>(null)
  const [keyPrincipals, setKeyPrincipals] = useState<Record<string, string[]>>({})

  useEffect(() => setA(kb.access), [kb.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(a) !== JSON.stringify(kb.access)
  const toolNameOk = /^[a-z][a-z0-9_]{2,40}$/.test(a.mcp.toolName)
  const toolNameUnique = !kbs.some((k) => k.id !== kb.id && k.access.mcp.enabled && k.access.mcp.toolName === a.mcp.toolName)
  const slugOk = /^[a-z0-9-]{3,40}$/.test(a.publicLink.slug)
  const nonWs = items.filter((i) => sources.some((s) => s.id === i.sourceId) && !i.acl.includes("workspace:*")).length
  const totalItems = items.filter((i) => sources.some((s) => s.id === i.sourceId)).length
  const keys = apiKeys.filter((k) => k.kbIds.includes(kb.id))
  const restricted = sources.some((s) => s.sensitivity === "restricted")

  const save = () => {
    if (a.mcp.enabled && (!toolNameOk || !toolNameUnique)) return toast.error("MCP tool name must match ^[a-z][a-z0-9_]{2,40}$ and be unique")
    if (a.publicLink.enabled && !slugOk) return toast.error("Share slug is 3 to 40 lowercase characters or hyphens")
    if (a.publicLink.enabled && a.publicLink.password && a.publicLink.password.length < 8) return toast.error("Password is 8 or more characters")
    if (a.publicLink.enabled && restricted) return toast.error("A knowledge base with restricted sources cannot have a public link")
    updateKb(kb.id, { access: a })
    toast.success("Access saved")
  }

  const principals = a.members.principals
  const candidates = [...members.map((m) => ({ id: `user:${m.email}`, label: m.name, sub: m.email, kind: "user" as const, role: m.role })), ...groups.map((g) => ({ id: `group:${g.name}`, label: g.name, sub: `${g.memberCount} members · directory group`, kind: "group" as const, role: undefined }))]

  return (
    <AdminOnly>
      <PageStateGate state={state} loading={<FormSkeleton />}>
        <div className="flex flex-col gap-4 pb-16">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Members" description="Who in the workspace can query this knowledge base.">
              <RadioGroup value={a.members.mode} onValueChange={(v) => setA({ ...a, members: { ...a.members, mode: v as "all" | "selected" } })} className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="all" /> All workspace members</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="selected" /> Selected members and groups</label>
              </RadioGroup>
              {a.members.mode === "selected" && (
                <div className="mt-3 space-y-2">
                  <ul className="divide-y rounded-md border">
                    {principals.map((p) => {
                      const c = candidates.find((x) => x.id === p)
                      return (
                        <li key={p} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                          <Avatar className="size-6"><AvatarFallback className="text-[10px] text-white" style={{ backgroundColor: getAvatarColor(p) }}>{getAvatarInitials(c?.label ?? p)}</AvatarFallback></Avatar>
                          <span className="min-w-0 flex-1 truncate">{c?.label ?? p}</span>
                          {c?.role && <Badge variant="secondary" className="font-normal capitalize">{c.role}</Badge>}
                          {c?.kind === "group" && <Badge variant="outline" className="font-normal">Group</Badge>}
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setA({ ...a, members: { ...a.members, principals: principals.filter((x) => x !== p) } })} aria-label="Remove"><X className="size-3.5" /></Button>
                        </li>
                      )
                    })}
                    {principals.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Nobody yet. Add members or groups.</li>}
                  </ul>
                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild><Button variant="outline" size="sm"><Plus className="size-3.5" /> Add member or group</Button></PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search people and groups" />
                        <CommandList>
                          <CommandEmpty>No match.</CommandEmpty>
                          <CommandGroup heading="People">
                            {candidates.filter((c) => c.kind === "user" && !principals.includes(c.id)).map((c) => (
                              <CommandItem key={c.id} value={`${c.label} ${c.sub}`} onSelect={() => { setA({ ...a, members: { ...a.members, principals: [...principals, c.id] } }); setPickerOpen(false) }}>
                                <Avatar className="size-6"><AvatarFallback className="text-[10px] text-white" style={{ backgroundColor: getAvatarColor(c.id) }}>{getAvatarInitials(c.label)}</AvatarFallback></Avatar>
                                <span className="flex-1">{c.label}</span><span className="text-xs text-muted-foreground">{c.role}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Groups">
                            {candidates.filter((c) => c.kind === "group" && !principals.includes(c.id)).map((c) => (
                              <CommandItem key={c.id} value={`${c.label} group`} onSelect={() => { setA({ ...a, members: { ...a.members, principals: [...principals, c.id] } }); setPickerOpen(false) }}>
                                <span className="flex-1">{c.label}</span><span className="text-xs text-muted-foreground">{c.sub}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </Section>

            <Section title="MCP server" description="Whether AI clients reach this knowledge base as a tool.">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-sm">Expose to MCP server</Label><Switch checked={a.mcp.enabled} onCheckedChange={(v) => setA({ ...a, mcp: { ...a.mcp, enabled: v } })} /></div>
                {a.mcp.enabled && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tool name</Label>
                    <Input value={a.mcp.toolName} onChange={(e) => setA({ ...a, mcp: { ...a.mcp, toolName: e.target.value } })} className={cn("font-mono text-xs", (!toolNameOk || !toolNameUnique) && "border-destructive")} />
                    {!toolNameOk && <p className="text-xs text-destructive">Lowercase letters, digits and underscores, 3 to 41 characters, starting with a letter.</p>}
                    {toolNameOk && !toolNameUnique && <p className="text-xs text-destructive">Another knowledge base already uses this tool name.</p>}
                    <p className="text-xs text-muted-foreground">MCP tokens and OAuth clients with <span className="font-mono">knowledge:read</span> reach it. The knowledge base description is the tool description. <Link href={`${base}/connect/mcp`} className="underline underline-offset-4">Manage tokens</Link>.</p>
                  </div>
                )}
              </div>
            </Section>
          </div>

          <Section title="API keys" description="Keys with this knowledge base in scope." actions={<Button asChild variant="outline" size="sm"><Link href={`${base}/kb/${kb.id}/api`}>Add key</Link></Button>} flush>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Name</TableHead><TableHead>Scopes</TableHead><TableHead>Principals</TableHead><TableHead>Last used</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell><div className="font-medium">{k.name}</div><div className="font-mono text-[11px] text-muted-foreground">{k.prefix}</div></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{k.scopes.map((s) => <Badge key={s} variant="outline" className="font-mono text-[11px] font-normal">{s}</Badge>)}</div></TableCell>
                      <TableCell>
                        <Popover open={principalsFor === k.id} onOpenChange={(o) => setPrincipalsFor(o ? k.id : null)}>
                          <PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-7 font-mono text-[11px]">{(keyPrincipals[k.id] ?? ["workspace:*"]).join(", ")}</Button></PopoverTrigger>
                          <PopoverContent className="w-80 space-y-2" align="start">
                            <p className="text-xs text-muted-foreground">Principals this key acts as when source permissions are respected.</p>
                            <TagInput value={keyPrincipals[k.id] ?? ["workspace:*"]} onChange={(v) => setKeyPrincipals((m) => ({ ...m, [k.id]: v }))} suggestions={["workspace:*", "group:HR", "group:Lending", "user:tom@northwind.example"]} />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{relative(k.lastUsedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{k.expiresAt ? shortDate(k.expiresAt) : "Never"}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setRevoking(k.id)}>Revoke</Button></TableCell>
                    </TableRow>
                  ))}
                  {keys.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No key has this knowledge base in scope.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-2.5">
              <Label className="text-sm">Allow any workspace API key with <span className="font-mono">kb:query</span> scope</Label>
              <Switch checked={a.anyApiKey} onCheckedChange={(v) => setA({ ...a, anyApiKey: v })} />
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Public share link" description="A minimal chat that answers without login.">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-sm">Enable public link</Label><Switch checked={a.publicLink.enabled} disabled={restricted} onCheckedChange={(v) => setA({ ...a, publicLink: { ...a.publicLink, enabled: v } })} /></div>
                {restricted && <p className="text-xs text-muted-foreground">Unavailable: this knowledge base reads a restricted source.</p>}
                {a.publicLink.enabled && (
                  <div className="space-y-3">
                    <CopyableField label="URL" value={`https://docs-ai.example/share/kb/${a.publicLink.slug}`} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Slug</Label><Input value={a.publicLink.slug} onChange={(e) => setA({ ...a, publicLink: { ...a.publicLink, slug: e.target.value } })} className={cn("font-mono text-xs", !slugOk && "border-destructive")} /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Answer style</Label><Select value={a.publicLink.answerStyle} onValueChange={(v) => setA({ ...a, publicLink: { ...a.publicLink, answerStyle: v as "chat" | "single" } })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="chat">Chat</SelectItem><SelectItem value="single">Single answer</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Password (optional)</Label><Input type="password" value={a.publicLink.password ?? ""} onChange={(e) => setA({ ...a, publicLink: { ...a.publicLink, password: e.target.value || undefined } })} placeholder="8+ characters" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Rate limit</Label><Select value={String(a.publicLink.rateLimit)} onValueChange={(v) => setA({ ...a, publicLink: { ...a.publicLink, rateLimit: Number(v) as 60 | 300 | 1000 } })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">60 per hour</SelectItem><SelectItem value="300">300 per hour</SelectItem><SelectItem value="1000">1000 per hour</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Show source links</Label><Switch checked={a.publicLink.showSourceLinks} onCheckedChange={(v) => setA({ ...a, publicLink: { ...a.publicLink, showSourceLinks: v } })} /></div>
                    {a.documentPermissions === "respect" && nonWs > 0 && (
                      <Alert>
                        <AlertTriangle className="size-4" />
                        <AlertTitle>Public callers will only see workspace-wide documents</AlertTitle>
                        <AlertDescription>{totalItems - nonWs} of {totalItems} documents. The rest carry source permissions that a public caller does not have.</AlertDescription>
                      </Alert>
                    )}
                    <Button asChild variant="outline" size="sm"><Link href={`/share/kb/${a.publicLink.slug}`} target="_blank"><ExternalLink className="size-3.5" /> Open public page</Link></Button>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Document permissions" description="How permissions from sources apply to callers.">
              <RadioGroup value={a.documentPermissions} onValueChange={(v) => setA({ ...a, documentPermissions: v as "respect" | "workspace" })} className="space-y-2">
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", a.documentPermissions === "respect" && "border-primary bg-primary/5")}>
                  <RadioGroupItem value="respect" className="mt-0.5" />
                  <div><div className="text-sm font-medium">Respect source permissions</div><p className="text-xs text-muted-foreground">Each caller only sees chunks whose ACL includes them. API keys and public links see only workspace-wide items unless a key is given explicit principals.</p></div>
                </label>
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3", a.documentPermissions === "workspace" && "border-primary bg-primary/5")}>
                  <RadioGroupItem value="workspace" className="mt-0.5" />
                  <div><div className="text-sm font-medium">Workspace-wide</div><p className="text-xs text-muted-foreground">Every chunk is visible to every allowed caller.</p></div>
                </label>
              </RadioGroup>
              {a.documentPermissions === "workspace" && nonWs > 0 && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Connector permissions are ignored</AlertTitle>
                  <AlertDescription>{nonWs} documents carry permissions from their source. With this setting every allowed caller can read them.</AlertDescription>
                </Alert>
              )}
            </Section>
          </div>
        </div>

        {dirty && (
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setA(kb.access)}>Discard</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        )}
        <ConfirmDialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)} title="Revoke this API key?" description="Every caller using it gets 401 immediately. This cannot be undone." confirmLabel="Revoke" destructive onConfirm={() => { if (revoking) revokeApiKey(revoking); setRevoking(null); toast.success("API key revoked") }} />
      </PageStateGate>
    </AdminOnly>
  )
}
