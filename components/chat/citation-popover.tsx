"use client"

import Link from "next/link"
import { ExternalLink, FileText } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { KbDot } from "@/components/knowledge/kb-dot"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import type { Citation } from "@/lib/mock/types"
import { kbForDocument } from "./chat-data"

export function CitationPopover({ citation, kbIds }: { citation: Citation; kbIds: string[] }) {
  const { base } = useWs()
  const items = useMock((s) => s.items)
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const kb = kbForDocument(citation.documentId, items, sources, kbs, kbIds)
  const item = items.find((i) => i.id === citation.documentId)
  const atSource = citation.url ?? item?.url
  const location = [citation.section, citation.page ? `p.${citation.page}` : undefined, citation.version].filter(Boolean).join(" · ")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded bg-primary/10 px-1 align-middle text-[10px] font-semibold tabular-nums text-primary hover:bg-primary/20" aria-label={`Citation ${citation.n}: ${citation.title}`}>
          {citation.n}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 p-3" align="start">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{citation.title}</p>
            {kb && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <KbDot color={kb.color} className="size-2" /> {kb.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{location}</p>
          </div>
        </div>
        <blockquote className="border-l-2 pl-3 text-xs text-muted-foreground">{citation.snippet}</blockquote>
        <div className="flex flex-wrap gap-2">
          {kb && (
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link href={`${base}/kb/${kb.id}/documents?doc=${citation.documentId}`}>Open document</Link>
            </Button>
          )}
          {atSource ? (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <a href={atSource} target="_blank" rel="noreferrer">
                Open at source <ExternalLink className="size-3" />
              </a>
            </Button>
          ) : item ? (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href={`${base}/sources/${item.sourceId}`}>Open at source</Link>
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
