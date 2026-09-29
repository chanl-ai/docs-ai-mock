"use client"

import { useMemo, useState } from "react"
import { ExternalLink, RefreshCw, MinusCircle, BadgeCheck, UserRound, AlertTriangle, Search, History, Download } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FieldRow } from "@/components/shared/surface"
import { TagInput } from "@/components/shared/tag-input"
import { ItemStatusBadge, SensitivityBadge, FreshnessBadge, MimeIcon } from "@/components/shared/status-badge"
import { useMock } from "@/lib/mock/store"
import { useRole } from "@/hooks/use-role"
import { itemDetail } from "@/lib/mock/detail"
import { bytes, dateTime, mimeLabel, num, shortDate } from "@/lib/format"
import type { Item } from "@/lib/mock/types"
import { cn } from "@/lib/utils"

const chunkKindLabel = { content: "content", question: "question", answer: "answer", summary: "summary", row: "row" } as const

export function DocumentSheet({ item, open, onOpenChange, onExclude }: { item?: Item; open: boolean; onOpenChange: (o: boolean) => void; onExclude?: (item: Item) => void }) {
  const { admin } = useRole()
  const sources = useMock((s) => s.sources)
  const members = useMock((s) => s.members)
  const reprocessItem = useMock((s) => s.reprocessItem)
  const excludeItem = useMock((s) => s.excludeItem)
  const verifyItem = useMock((s) => s.verifyItem)
  const setItemTags = useMock((s) => s.setItemTags)
  const setItemOwner = useMock((s) => s.setItemOwner)
  const [chunkQuery, setChunkQuery] = useState("")
  const [diffRev, setDiffRev] = useState<number | null>(null)
  const [ownerOpen, setOwnerOpen] = useState(false)

  const source = item ? sources.find((s) => s.id === item.sourceId) : undefined
  const detail = useMemo(() => (item ? itemDetail(item) : undefined), [item])
  const editableTags = source && (source.type === "file" || source.type === "text")
  const filteredChunks = detail?.chunks.filter((c) => !chunkQuery || c.text.toLowerCase().includes(chunkQuery.toLowerCase()) || c.location.toLowerCase().includes(chunkQuery.toLowerCase())) ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
        {item && detail && (
          <>
            <SheetHeader className="space-y-2 border-b pb-3">
              <div className="flex items-start gap-2 pr-6">
                <MimeIcon mime={item.mimeType} className="mt-1 size-4" />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-base leading-tight">{item.title}</SheetTitle>
                  <SheetDescription className="truncate font-mono text-xs">{item.path}</SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <ItemStatusBadge status={item.status} />
                <SensitivityBadge level={item.sensitivity} />
                <FreshnessBadge reviewBy={item.reviewBy} />
                {item.verified && <Badge variant="outline" className="gap-1 font-normal"><BadgeCheck className="size-3 text-emerald-600" /> Verified</Badge>}
                <Badge variant="outline" className="font-mono text-[11px] font-normal">{item.version}</Badge>
              </div>
              {item.status === "failed" && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="size-4" />
                  <AlertTitle className="text-sm">{item.error}</AlertTitle>
                  <AlertDescription className="text-xs">Error class: {item.errorClass}. Fix the file at the source or upload an unlocked copy, then reprocess.</AlertDescription>
                </Alert>
              )}
              {admin && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-7" onClick={() => { reprocessItem(item.id); toast.success("Reprocessing", { description: item.title }) }}><RefreshCw className="size-3.5" /> Reprocess</Button>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => { verifyItem(item.id, !item.verified); toast.success(item.verified ? "Verification removed" : "Marked verified", { description: item.verified ? undefined : "Review-by date reset to 90 days from today." }) }}><BadgeCheck className="size-3.5" /> {item.verified ? "Unverify" : "Mark verified"}</Button>
                  {item.url && (
                    <Button size="sm" variant="outline" className="h-7" asChild>
                      <a href={item.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open at source</a>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-7">More</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setOwnerOpen(true)}><UserRound className="size-4" /> Set owner</DropdownMenuItem>
                      {item.fileId && <DropdownMenuItem><Download className="size-4" /> Download original</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => { if (onExclude) onExclude(item); else excludeItem(item.id); toast.message("Excluded", { description: "An exclude rule was added for this path." }) }}><MinusCircle className="size-4" /> Exclude</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </SheetHeader>
            <Tabs defaultValue="content" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-4 mt-3 w-fit">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="chunks">Chunks <span className="ml-1 text-muted-foreground">{detail.chunks.length}</span></TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {item.pageCount && <span>{item.pageCount} pages</span>}
                      <span>{mimeLabel(item.mimeType)} · {bytes(item.sizeBytes)}</span>
                      <span>Modified at source {shortDate(item.modifiedAt)}</span>
                    </div>
                    <article className="prose prose-sm max-w-none text-sm dark:prose-invert">
                      {detail.content.split("\n").map((line, i) =>
                        line.startsWith("# ") ? <h2 key={i} className="mt-2 text-base font-semibold">{line.slice(2)}</h2> : line.startsWith("## ") ? <h3 key={i} id={`sec-${i}`} className="mt-4 text-sm font-semibold">{line.slice(3)}</h3> : line.startsWith("|") ? <pre key={i} className="overflow-x-auto font-mono text-[11px]">{line}</pre> : line ? <p key={i} className="my-1.5 leading-relaxed">{line}</p> : null
                      )}
                    </article>
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="chunks" className="flex min-h-0 flex-1 flex-col">
                <div className="px-4 pb-2 pt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                    <Input value={chunkQuery} onChange={(e) => setChunkQuery(e.target.value)} placeholder="Search within chunks" className="h-8 pl-8" />
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <ol className="divide-y px-4 pb-4">
                    {filteredChunks.map((c) => (
                      <li key={c.index} className="space-y-1 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">#{c.index + 1}</span>
                          <span className="tabular-nums">{c.tokens} tokens</span>
                          <span>{c.location}</span>
                          <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">{chunkKindLabel[c.kind]}</Badge>
                        </div>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed">{c.text}</p>
                      </li>
                    ))}
                    {filteredChunks.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No chunks match.</li>}
                  </ol>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="metadata" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-5 p-4">
                    <div>
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Governance</h4>
                      <FieldRow label="Owner" value={item.owner} />
                      <FieldRow label="Version" value={item.version} mono />
                      <FieldRow label="Effective" value={item.effectiveDate} />
                      <FieldRow label="Supersedes" value={item.supersedes} />
                      <FieldRow label="Review by" value={item.reviewBy} />
                      <FieldRow label="Collection" value={item.collection} />
                      <FieldRow label="Sensitivity" value={<SensitivityBadge level={item.sensitivity} />} />
                      <FieldRow label="Queries · 30d" value={num(item.queries30d)} />
                    </div>
                    <div>
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Mapped from the source</h4>
                      {Object.entries(item.metadata).length === 0 && <p className="text-xs text-muted-foreground">No metadata mapped.</p>}
                      {Object.entries(item.metadata).map(([k, v]) => <FieldRow key={k} label={k} value={v} mono />)}
                      <FieldRow label="External id" value={item.externalId} mono />
                    </div>
                    <div>
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</h4>
                      {editableTags && admin ? <TagInput value={item.tags} onChange={(t) => setItemTags(item.id, t)} placeholder="Add tag" /> : (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((t) => <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>)}
                          {source && !editableTags && <p className="w-full text-xs text-muted-foreground">Mapped from the source; edit tags on the source's Rules and metadata.</p>}
                        </div>
                      )}
                    </div>
                    {admin && (
                      <div>
                        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Who can see this document</h4>
                        <div className="flex flex-wrap gap-1">{item.acl.map((p) => <Badge key={p} variant="outline" className="font-mono text-[11px] font-normal">{p}</Badge>)}</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="history" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {source && !["file", "text"].includes(source.type) ? (
                      <ul className="divide-y text-sm">
                        {detail.revisions.map((r) => (
                          <li key={r.n} className="flex items-center gap-3 py-2">
                            <History className="size-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div>Sync picked up a change</div>
                              <div className="text-xs text-muted-foreground">{dateTime(r.date)} · {r.sizeDelta >= 0 ? "+" : ""}{bytes(Math.abs(r.sizeDelta))}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Rev</TableHead><TableHead>Author</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Δ size</TableHead><TableHead /></TableRow></TableHeader>
                        <TableBody>
                          {detail.revisions.map((r) => (
                            <TableRow key={r.n}>
                              <TableCell className="font-mono text-xs">{r.n}{r.note && <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] font-normal">{r.note}</Badge>}</TableCell>
                              <TableCell>{r.author}</TableCell>
                              <TableCell className="text-muted-foreground">{shortDate(r.date)}</TableCell>
                              <TableCell className={cn("text-right tabular-nums", r.sizeDelta < 0 && "text-destructive")}>{r.sizeDelta >= 0 ? "+" : "−"}{bytes(Math.abs(r.sizeDelta))}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-7" onClick={() => setDiffRev(r.n)}>Diff</Button>
                                {r.n !== detail.revisions[0].n && admin && <Button variant="ghost" size="sm" className="h-7" onClick={() => toast.success(`Restored revision ${r.n}`, { description: "The item will reprocess." })}>Restore</Button>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>

      <Dialog open={diffRev !== null} onOpenChange={(o) => !o && setDiffRev(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Revision {diffRev} vs current</DialogTitle>
            <DialogDescription>Side by side over 900px, unified below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <pre className="max-h-80 overflow-auto rounded-md border bg-red-50 p-3 font-mono text-[11px] leading-relaxed dark:bg-red-950/30">- Top-up is 85% of base salary for 16 weeks.{"\n"}- Employees must have 6 months of service.{"\n"}  Requests go through the People portal.</pre>
            <pre className="max-h-80 overflow-auto rounded-md border bg-emerald-50 p-3 font-mono text-[11px] leading-relaxed dark:bg-emerald-950/30">+ Top-up is 90% of base salary for 18 weeks (birth parent) and 8 weeks (other parent).{"\n"}+ Employees must have 12 months of continuous service.{"\n"}  Requests go through the People portal.</pre>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDiffRev(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ownerOpen} onOpenChange={setOwnerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set owner</DialogTitle>
            <DialogDescription>The owner receives stale nudges and curation items for this document.</DialogDescription>
          </DialogHeader>
          {item && (
            <Select value={item.owner} onValueChange={(v) => { setItemOwner(item.id, v); setOwnerOpen(false); toast.success("Owner updated") }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.userId} value={m.name}>{m.name}</SelectItem>)}{!members.some((m) => m.name === item.owner) && <SelectItem value={item.owner}>{item.owner}</SelectItem>}</SelectContent>
            </Select>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
