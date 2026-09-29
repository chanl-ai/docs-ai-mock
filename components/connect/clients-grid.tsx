"use client"

import { useState } from "react"
import { useWs } from "@/lib/mock/hooks"
import { cn } from "@/lib/utils"
import { CLIENTS, type ClientDef } from "./connect-helpers"
import { ClientAvatar, ClientSeenBadge, ClientSetupDialog } from "./client-setup-dialog"

/** Each card is a different setup path, so a grid is right here (not a homogeneous list). */
export function ClientsGrid({ compact, slug: slugProp }: { compact?: boolean; slug?: string }) {
  const ws = useWs()
  const slug = slugProp ?? ws.slug
  const base = `/w/${slug}`
  const [openId, setOpenId] = useState<ClientDef["id"] | null>(null)
  const current = CLIENTS.find((c) => c.id === openId)

  return (
    <>
      <ul className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {CLIENTS.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setOpenId(c.id)} className={cn("flex h-full w-full flex-col gap-3 rounded-lg border bg-card text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", compact ? "p-3" : "p-4")}>
              <div className="flex w-full items-start gap-3">
                <ClientAvatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.name}</div>
                  {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{c.blurb}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ClientSeenBadge client={c} />
                {c.seen && <span className="text-xs text-muted-foreground">{c.seen.ago} · <span className="font-mono text-[11px]">{c.seen.agent}</span></span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {current && <ClientSetupDialog key={current.id} client={current} slug={slug} base={base} open={!!current} onOpenChange={(o) => !o && setOpenId(null)} />}
    </>
  )
}
