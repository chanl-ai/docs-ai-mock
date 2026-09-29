"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Home, Database, Plug, FolderOpen, MessagesSquare, Wrench, Activity, KeyRound, Blocks, MonitorSmartphone, Server, ShieldCheck, Users, BarChart3, ScrollText, Settings, FileText } from "lucide-react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { SourceTypeIcon } from "@/lib/mock/source-types"
import { MimeIcon } from "@/components/shared/status-badge"

export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const { base } = useWs()
  const kbs = useMock((s) => s.kbs)
  const sources = useMock((s) => s.sources)
  const tools = useMock((s) => s.tools)
  const files = useMock((s) => s.files)

  const go = (path: string) => {
    onOpenChange(false)
    router.push(`${base}${path}`)
  }

  const screens = [
    { title: "Home", path: "", icon: Home },
    { title: "Knowledge bases", path: "/kb", icon: Database },
    { title: "Sources", path: "/sources", icon: Plug },
    { title: "Files", path: "/files", icon: FolderOpen },
    { title: "Chat", path: "/chat", icon: MessagesSquare },
    { title: "Tools", path: "/tools", icon: Wrench },
    { title: "Executions", path: "/executions", icon: Activity },
    { title: "Secrets", path: "/secrets", icon: KeyRound },
    { title: "Integrations", path: "/integrations", icon: Blocks },
    { title: "AI clients", path: "/connect/clients", icon: MonitorSmartphone },
    { title: "MCP server", path: "/connect/mcp", icon: Server },
    { title: "OAuth clients", path: "/connect/oauth-clients", icon: ShieldCheck },
    { title: "Team", path: "/team", icon: Users },
    { title: "Analytics", path: "/analytics", icon: BarChart3 },
    { title: "Audit log", path: "/audit", icon: ScrollText },
    { title: "Settings", path: "/settings/general", icon: Settings },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a screen, knowledge base, source, file or tool…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Knowledge bases">
          {kbs.map((k) => (
            <CommandItem key={k.id} value={`kb ${k.name}`} onSelect={() => go(`/kb/${k.id}`)}>
              <Database className="size-4 text-muted-foreground" />
              {k.name}
              <span className="ml-auto font-mono text-xs text-muted-foreground">{k.slug}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Sources">
          {sources.map((s) => (
            <CommandItem key={s.id} value={`source ${s.name}`} onSelect={() => go(`/sources/${s.id}`)}>
              <SourceTypeIcon type={s.type} />
              {s.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tools">
          {tools.map((t) => (
            <CommandItem key={t.id} value={`tool ${t.name} ${t.slug}`} onSelect={() => go(`/tools/${t.id}/general`)}>
              <Wrench className="size-4 text-muted-foreground" />
              {t.name}
              <span className="ml-auto font-mono text-xs text-muted-foreground">{t.slug}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Files">
          {files.slice(0, 12).map((f) => (
            <CommandItem key={f.id} value={`file ${f.name}`} onSelect={() => go(`/files/${f.id}`)}>
              <MimeIcon mime={f.mimeType} />
              {f.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Screens">
          {screens.map((s) => (
            <CommandItem key={s.path} value={`screen ${s.title}`} onSelect={() => go(s.path)}>
              <s.icon className="size-4 text-muted-foreground" />
              {s.title}
            </CommandItem>
          ))}
          <CommandItem value="screen documents" onSelect={() => go(`/kb/${kbs[0]?.id}/documents`)}>
            <FileText className="size-4 text-muted-foreground" />
            Documents
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
