"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Palette, Settings2, ShieldCheck, Wrench } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { useWs } from "@/lib/mock/hooks"
import { cn } from "@/lib/utils"

const NAV = [
  { slug: "general", label: "General", icon: Settings2 },
  { slug: "security", label: "Security", icon: ShieldCheck },
  { slug: "appearance", label: "Appearance", icon: Palette },
  { slug: "notifications", label: "Notifications", icon: Bell },
  { slug: "advanced", label: "Advanced", icon: Wrench },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { base } = useWs()
  const current = NAV.find((n) => pathname.startsWith(`${base}/settings/${n.slug}`))?.slug ?? "general"

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Workspace identity, models, security policy and your own preferences." />
      <Tabs value={current} className="md:hidden">
        <div className="-mx-4 overflow-x-auto px-4">
          <TabsList>
            {NAV.map((n) => (
              <TabsTrigger key={n.slug} value={n.slug} asChild>
                <Link href={`${base}/settings/${n.slug}`}>{n.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <div className="flex min-w-0 gap-8">
        <nav aria-label="Settings" className="hidden w-48 shrink-0 md:block">
          <ul className="sticky top-4 space-y-0.5">
            {NAV.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`${base}/settings/${n.slug}`}
                  aria-current={current === n.slug ? "page" : undefined}
                  className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", current === n.slug && "bg-accent font-medium text-foreground")}
                >
                  <n.icon className="size-4" /> {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 max-w-3xl flex-1 space-y-4">{children}</div>
      </div>
    </div>
  )
}
