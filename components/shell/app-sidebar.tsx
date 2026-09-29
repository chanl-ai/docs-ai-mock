"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Database, Plug, FolderOpen, MessagesSquare, Wrench, Activity, KeyRound, Blocks, MonitorSmartphone, Server, ShieldCheck, Users, BarChart3, ScrollText, Settings, type LucideIcon } from "lucide-react"
import { NavUser } from "@/components/shell/nav-user"
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { useMock } from "@/lib/mock/store"
import { useRole } from "@/hooks/use-role"
import { useWs } from "@/lib/mock/hooks"

interface NavItem {
  title: string
  path: string
  icon: LucideIcon
  adminOnly?: boolean
  badge?: number
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { base } = useWs()
  const { admin } = useRole()
  const failedSources = useMock((s) => s.sources.filter((x) => x.lastRunStatus === "failed" || x.status === "revoked").length)
  const pendingProposals = useMock((s) => s.proposals.filter((p) => p.status === "pending").length)

  const groups: { label?: string; items: NavItem[] }[] = [
    { items: [{ title: "Home", path: "", icon: Home }] },
    {
      label: "Knowledge",
      items: [
        { title: "Knowledge bases", path: "/kb", icon: Database, badge: pendingProposals || undefined },
        { title: "Sources", path: "/sources", icon: Plug, adminOnly: true, badge: failedSources || undefined },
        { title: "Files", path: "/files", icon: FolderOpen },
        { title: "Chat", path: "/chat", icon: MessagesSquare },
      ],
    },
    {
      label: "Tools",
      items: [
        { title: "Tools", path: "/tools", icon: Wrench },
        { title: "Executions", path: "/executions", icon: Activity },
        { title: "Secrets", path: "/secrets", icon: KeyRound, adminOnly: true },
        { title: "Integrations", path: "/integrations", icon: Blocks, adminOnly: true },
      ],
    },
    {
      label: "Connect",
      items: [
        { title: "AI clients", path: "/connect/clients", icon: MonitorSmartphone },
        { title: "MCP server", path: "/connect/mcp", icon: Server },
        { title: "OAuth clients", path: "/connect/oauth-clients", icon: ShieldCheck, adminOnly: true },
      ],
    },
    {
      label: "Workspace",
      items: [
        { title: "Team", path: "/team", icon: Users },
        { title: "Analytics", path: "/analytics", icon: BarChart3, adminOnly: true },
        { title: "Audit log", path: "/audit", icon: ScrollText, adminOnly: true },
        { title: "Settings", path: "/settings/general", icon: Settings },
      ],
    },
  ]

  const isActive = (path: string) => {
    const full = `${base}${path}`
    if (path === "") return pathname === base
    if (path === "/settings/general") return pathname.startsWith(`${base}/settings`)
    return pathname === full || pathname.startsWith(`${full}/`)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <WorkspaceSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g, i) => {
          // Items the role cannot use are hidden, not disabled.
          const items = g.items.filter((it) => admin || !it.adminOnly)
          if (!items.length) return null
          return (
            <SidebarGroup key={g.label ?? i}>
              {g.label && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.title}>
                        <Link href={`${base}${item.path}`}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge ? <SidebarMenuBadge className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">{item.badge}</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
