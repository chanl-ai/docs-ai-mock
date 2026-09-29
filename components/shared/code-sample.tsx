"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { CopyButton } from "./copy"
import { cn } from "@/lib/utils"

export interface CodeTab {
  id: string
  label: string
  code: string
  language?: string
}

export function CodeBlock({ code, className, maxHeight = 360 }: { code: string; className?: string; maxHeight?: number }) {
  return (
    <div className={cn("relative rounded-md border bg-muted/40", className)}>
      <div className="absolute right-2 top-2 z-10">
        <CopyButton text={code} iconOnly variant="ghost" />
      </div>
      <ScrollArea style={{ maxHeight }} className="w-full">
        <pre className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

/** Code samples with language tabs and one copy button per tab. */
export function CodeSample({ tabs, className, defaultTab }: { tabs: CodeTab[]; className?: string; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const current = tabs.find((t) => t.id === active) ?? tabs[0]
  if (!current) return null
  return (
    <div className={cn("space-y-2", className)}>
      <Tabs value={current.id} onValueChange={setActive}>
        <TabsList className="h-8">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="h-7 px-3 text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <CodeBlock code={current.code} />
    </div>
  )
}
