"use client"

import { useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useMock } from "@/lib/mock/store"

function StoreBoot() {
  const tick = useMock((s) => s.tick)
  useEffect(() => {
    useMock.persist.rehydrate()
    const id = setInterval(() => tick(), 1200)
    return () => clearInterval(id)
  }, [tick])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <StoreBoot />
        {children}
      </TooltipProvider>
    </ThemeProvider>
  )
}
