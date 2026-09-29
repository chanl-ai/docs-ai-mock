"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertTriangle, Copy, FilePenLine, RefreshCw, SearchX, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCopy } from "@/components/shared/copy"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { useRole } from "@/hooks/use-role"
import { cn } from "@/lib/utils"
import type { ChatMessage, Thread } from "@/lib/mock/types"
import { CitationPopover } from "./citation-popover"
import { ToolCallCard } from "./tool-call-card"
import { kbForDocument } from "./chat-data"

// Markers arrive as "[1]" or "[^1]"; they become #cite-n links the renderer swaps for popovers.
const withCiteLinks = (text: string) => text.replace(/\[\^?(\d+)\]/g, (_, n) => ` [${n}](#cite-${n})`)

export function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="Thinking">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

function IconAction({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-7", active && "bg-accent text-foreground")} onClick={onClick} aria-label={label} aria-pressed={active}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function MessageView({
  message,
  thread,
  readOnly,
  streaming,
  thinking,
  pendingTool,
  errored,
  onRegenerate,
}: {
  message: ChatMessage
  thread: Thread
  readOnly?: boolean
  streaming?: boolean
  thinking?: boolean
  pendingTool?: ChatMessage["toolCall"]
  errored?: boolean
  onRegenerate?: () => void
}) {
  const router = useRouter()
  const { base } = useWs()
  const { admin } = useRole()
  const { copy } = useCopy()
  const user = useMock((s) => s.user)
  const items = useMock((s) => s.items)
  const sources = useMock((s) => s.sources)
  const kbs = useMock((s) => s.kbs)
  const setFeedback = useMock((s) => s.setFeedback)
  const addProposal = useMock((s) => s.addProposal)
  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposeDoc, setProposeDoc] = useState<string>("")
  const [proposeText, setProposeText] = useState("")

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">{message.content}</div>
      </div>
    )
  }

  const cites = message.citations ?? []
  const noAnswerKb = kbs.find((k) => k.id === (thread.kbIds.find((id) => id !== "kb_all") ?? thread.kbIds[0]))
  const openPropose = () => {
    setProposeDoc(cites[0]?.documentId ?? "")
    setProposeText(message.content.replace(/\s*\[\^?\d+\]/g, ""))
    setProposeOpen(true)
  }
  const submitProposal = () => {
    const c = cites.find((x) => x.documentId === proposeDoc)
    if (!c) return
    const kb = kbForDocument(c.documentId, items, sources, kbs, thread.kbIds)
    if (!kb) return
    addProposal({ kbId: kb.id, documentId: c.documentId, documentTitle: c.title, kind: "update", proposedBy: user.name, proposerKind: "member", sizeDelta: proposeText.length - c.snippet.length, note: `From the chat "${thread.title}"`, before: "", after: proposeText })
    setProposeOpen(false)
    toast.success("Update proposed", { description: `${c.title} · waiting for a reviewer`, action: { label: "View proposals", onClick: () => router.push(`${base}/kb/${kb.id}/proposals`) } })
  }

  return (
    <div className="group flex flex-col gap-2">
      {pendingTool && <ToolCallCard call={pendingTool} running />}
      {message.toolCall && <ToolCallCard call={message.toolCall} />}
      {thinking && !message.content ? (
        <ThinkingDots />
      ) : message.noAnswer && !streaming ? (
        <div className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
          <SearchX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p>{message.content}</p>
            {admin && noAnswerKb && (
              <Link href={`${base}/kb/${noAnswerKb.id}/playground`} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Try the playground to see what retrieval found
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="prose-sm max-w-none text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
                const m = href?.match(/^#cite-(\d+)$/)
                if (m) {
                  const c = cites.find((x) => x.n === Number(m[1]))
                  if (c) return <CitationPopover citation={c} kbIds={thread.kbIds} />
                  return streaming ? null : <sup className="text-muted-foreground">{m[1]}</sup>
                }
                return <a href={href} className="underline underline-offset-4">{children}</a>
              },
            }}
          >
            {streaming ? message.content.replace(/\s*\[\^?\d*\]?$/, "").replace(/\s*\[\^?\d+\]/g, "") : withCiteLinks(message.content)}
          </ReactMarkdown>
          {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60 align-middle" />}
        </div>
      )}

      {message.structured && message.structured.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {message.structured.map((v) => (
                <TableRow key={v.label}>
                  <TableCell>{v.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.value}{v.unit ? ` ${v.unit}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.from}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {errored && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>The answer stopped part-way</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>The connection to the model dropped. The text above is what arrived. Retry to generate the full answer.</p>
            {onRegenerate && (
              <Button size="sm" variant="outline" className="border-destructive/40 text-foreground" onClick={onRegenerate}>
                <RefreshCw className="size-3.5" /> Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!readOnly && !streaming && !thinking && !errored && message.content && (
        <div className="flex flex-wrap items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <IconAction label="Copy" onClick={() => copy(message.content, "Answer copied")}><Copy className="size-3.5" /></IconAction>
          {onRegenerate && <IconAction label="Regenerate" onClick={onRegenerate}><RefreshCw className="size-3.5" /></IconAction>}
          <IconAction label="Good answer" active={message.feedback === "up"} onClick={() => setFeedback(thread.id, message.id, message.feedback === "up" ? undefined : "up")}><ThumbsUp className="size-3.5" /></IconAction>
          <IconAction label="Bad answer" active={message.feedback === "down"} onClick={() => { setFeedback(thread.id, message.id, message.feedback === "down" ? undefined : "down"); if (message.feedback !== "down") toast.message("Thanks. Negative feedback shows in the knowledge base's analytics.") }}><ThumbsDown className="size-3.5" /></IconAction>
          {cites.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={openPropose}>
              <FilePenLine className="size-3.5" /> Propose an update
            </Button>
          )}
        </div>
      )}
      {readOnly && message.feedback && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {message.feedback === "up" ? <ThumbsUp className="size-3" /> : <ThumbsDown className="size-3" />} Rated {message.feedback === "up" ? "helpful" : "not helpful"}
        </p>
      )}

      <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4" /> Propose an update</DialogTitle>
            <DialogDescription>A reviewer for the document&apos;s knowledge base approves or rejects the change. Nothing is edited until then.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document</Label>
              <Select value={proposeDoc} onValueChange={setProposeDoc}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cites.map((c) => (
                    <SelectItem key={c.documentId} value={c.documentId}>{c.title} · {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propose-text">Suggested text</Label>
              <Textarea id="propose-text" rows={6} value={proposeText} onChange={(e) => setProposeText(e.target.value)} />
              <p className="text-xs text-muted-foreground">Prefilled with the assistant&apos;s answer. Edit it to the wording the document should have.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeOpen(false)}>Cancel</Button>
            <Button onClick={submitProposal} disabled={!proposeText.trim() || !proposeDoc}>Send for review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
