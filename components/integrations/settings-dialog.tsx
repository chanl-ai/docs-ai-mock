"use client"

import { useEffect, useState } from "react"
import { RefreshCw, RotateCcw, Unplug } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteDialog } from "@/components/shared/dialogs"
import { FieldRow, Rows, Row } from "@/components/shared/surface"
import { SourceStatusBadge } from "@/components/shared/status-badge"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { dateTime, relative } from "@/lib/format"
import { SourceTypeIcon } from "@/lib/mock/source-types"
import type { Integration } from "@/lib/mock/types"

export type SettingsTab = "account" | "tools" | "sources" | "defaults"

export function SettingsDialog({ integration, initialTab = "account", onOpenChange }: { integration?: Integration; initialTab?: SettingsTab; onOpenChange: (o: boolean) => void }) {
  const { base } = useWs()
  const sources = useMock((s) => s.sources)
  const tools = useMock((s) => s.tools)
  const reconnect = useMock((s) => s.reconnectIntegration)
  const disconnect = useMock((s) => s.disconnectIntegration)
  const setTool = useMock((s) => s.setIntegrationTool)
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [confirm, setConfirm] = useState(false)
  const [calendar, setCalendar] = useState("primary")

  useEffect(() => setTab(initialTab), [integration?.id, initialTab])

  if (!integration) return null
  const i = integration
  const linkedSources = sources.filter((s) => s.connectionId === i.id)
  const linkedTools = tools.filter((t) => t.integrationType === i.type)

  return (
    <>
      <Dialog open={!!integration && !confirm} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{i.name}</DialogTitle>
            <DialogDescription>One connection for the whole workspace. Sources and tools below reuse it.</DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="account">Account</TabsTrigger>
              {i.tools && <TabsTrigger value="tools">Tools</TabsTrigger>}
              {i.knowledge && <TabsTrigger value="sources">Sources</TabsTrigger>}
              <TabsTrigger value="defaults">Defaults</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4 pt-3">
              <div>
                <FieldRow label="Connected as" value={i.connectedAs} mono />
                <FieldRow label="Connected by" value={i.connectedBy} />
                <FieldRow label="Connected" value={i.connectedAt ? `${dateTime(i.connectedAt)} · ${relative(i.connectedAt)}` : undefined} />
                <FieldRow label="Auth" value={i.authMethod === "oauth" ? "OAuth" : i.authMethod === "certificate" ? "App-only certificate" : "API key or token"} />
                <FieldRow label="Scopes granted" wrap value={i.scopes?.length ? <span className="flex flex-wrap gap-1">{i.scopes.map((s) => <Badge key={s} variant="outline" className="font-mono text-xs font-normal">{s}</Badge>)}</span> : undefined} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { reconnect(i.id); toast.success(`${i.name} reconnected`) }}><RefreshCw className="size-4" /> Reconnect</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirm(true)}><Unplug className="size-4" /> Disconnect</Button>
              </div>
            </TabsContent>

            {i.tools && (
              <TabsContent value="tools" className="space-y-3 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">Enabled tools become callable by assistants. Writes are off by default.</p>
                  <Button size="sm" variant="ghost" onClick={() => { i.availableTools.forEach((t) => setTool(i.id, t.name, t.kind === "read")); toast.success("Tool defaults restored", { description: "Reads on, writes off" }) }}>
                    <RotateCcw className="size-4" /> Reset defaults
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Tool</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead className="text-right">Enabled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {i.availableTools.map((t) => (
                        <TableRow key={t.name}>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{t.name}</TableCell>
                          <TableCell className="min-w-[160px] text-sm text-muted-foreground">{t.description}</TableCell>
                          <TableCell><Badge variant={t.kind === "write" ? "secondary" : "outline"} className="font-normal">{t.kind === "write" ? "Write" : "Read"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Switch checked={t.enabled} aria-label={`Enable ${t.name}`} onCheckedChange={(v) => { setTool(i.id, t.name, v); toast.success(v ? "Tool enabled" : "Tool disabled", { description: t.name }) }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )}

            {i.knowledge && (
              <TabsContent value="sources" className="pt-3">
                {linkedSources.length === 0 ? (
                  <p className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">No sources use this connection yet.</p>
                ) : (
                  <Rows className="rounded-md border">
                    {linkedSources.map((s) => (
                      <Row key={s.id} href={`${base}/sources/${s.id}`} leading={<SourceTypeIcon type={s.type} className="size-4 text-muted-foreground" />} title={s.name} description={s.scopeSummary} trailing={<SourceStatusBadge status={s.status} />} />
                    ))}
                  </Rows>
                )}
              </TabsContent>
            )}

            <TabsContent value="defaults" className="pt-3">
              {i.type === "gcal" ? (
                <div className="max-w-xs space-y-1.5">
                  <Label>Default calendar</Label>
                  <Select value={calendar} onValueChange={(v) => { setCalendar(v); toast.success("Default calendar saved") }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary ({i.connectedAs ?? "connected account"})</SelectItem>
                      <SelectItem value="rm-bookings">RM bookings</SelectItem>
                      <SelectItem value="branch-appointments">Branch appointments</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Used when an assistant books a meeting without naming a calendar.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{i.name} has no app-specific defaults. Each source or tool that uses it carries its own settings.</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={confirm}
        onOpenChange={(o) => { setConfirm(o) }}
        title={`Disconnect ${i.name}?`}
        objectName={i.name}
        confirmLabel="Disconnect"
        description="The stored credentials are deleted. Indexed content stays searchable but stops updating."
        dependents={[
          { kind: "source", names: linkedSources.map((s) => s.name) },
          { kind: "tool", names: linkedTools.map((t) => t.name) },
        ]}
        consequence={linkedSources.length || linkedTools.length ? "These stop working until the connection is restored." : undefined}
        onConfirm={() => { disconnect(i.id); toast.success(`${i.name} disconnected`); onOpenChange(false) }}
      />
    </>
  )
}
