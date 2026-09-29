"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, CircleHelp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { SearchCommand } from "./search-command"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"

const LABELS: Record<string, string> = {
  kb: "Knowledge bases",
  sources: "Sources",
  files: "Files",
  chat: "Chat",
  conversations: "Conversations",
  tools: "Tools",
  executions: "Executions",
  secrets: "Secrets",
  integrations: "Integrations",
  connect: "Connect",
  clients: "AI clients",
  mcp: "MCP server",
  "oauth-clients": "OAuth clients",
  team: "Team",
  analytics: "Analytics",
  audit: "Audit log",
  settings: "Settings",
  general: "General",
  security: "Security",
  appearance: "Appearance",
  notifications: "Notifications",
  advanced: "Advanced",
  new: "New",
  import: "Import",
  storage: "Storage",
  overview: "Overview",
  documents: "Documents",
  retrieval: "Retrieval",
  playground: "Playground",
  api: "API",
  access: "Access",
  proposals: "Proposals",
  evals: "Evals",
  curation: "Curation",
  items: "Items",
  history: "History",
  rest: "REST",
  code: "Code",
  test: "Test",
  workflows: "Workflows",
}

export function SiteHeader() {
  const pathname = usePathname()
  const { base } = useWs()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const kbs = useMock((s) => s.kbs)
  const sources = useMock((s) => s.sources)
  const tools = useMock((s) => s.tools)
  const files = useMock((s) => s.files)
  const threads = useMock((s) => s.threads)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const rest = pathname.startsWith(base) ? pathname.slice(base.length).split("/").filter(Boolean) : []
  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: base }]
  let acc = base
  rest.forEach((seg, i) => {
    acc += `/${seg}`
    const isLast = i === rest.length - 1
    let label = LABELS[seg] ?? seg
    const entity = kbs.find((k) => k.id === seg) ?? sources.find((s) => s.id === seg) ?? tools.find((t) => t.id === seg) ?? files.find((f) => f.id === seg) ?? threads.find((t) => t.id === seg)
    if (entity) label = "name" in entity ? entity.name : entity.title
    if (seg === "connect") return // group label, not a page
    crumbs.push({ label, href: isLast ? undefined : acc })
  })

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex w-full min-w-0 items-center justify-between gap-2 px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <BreadcrumbSeparator className={i < crumbs.length - 2 ? "hidden md:block" : ""} />}
                  <BreadcrumbItem className={i < crumbs.length - 2 ? "hidden md:block" : "min-w-0"}>
                    {c.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={c.href} className="truncate">{c.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="truncate font-medium">{c.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs md:px-3" onClick={() => setSearchOpen(true)}>
            <Search className="size-3.5" />
            <span className="hidden md:inline">Search</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Help">
            <CircleHelp className="size-4" />
          </Button>
        </div>
      </div>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
