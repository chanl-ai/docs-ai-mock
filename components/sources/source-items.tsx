"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, ExternalLink, FileSearch, MinusCircle, MoreHorizontal, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTable, SortHeader, selectColumn } from "@/components/shared/data-table"
import { ItemStatusBadge, MimeIcon } from "@/components/shared/status-badge"
import { EmptyState, PageStateGate } from "@/components/shared/states"
import { CopyButton } from "@/components/shared/copy"
import { DocumentSheet } from "@/components/knowledge/document-sheet"
import { usePageState } from "@/hooks/use-page-state"
import { useMock } from "@/lib/mock/store"
import { bytes, mimeLabel, num, relative, shortDate } from "@/lib/format"
import type { ErrorClass, Item } from "@/lib/mock/types"
import { useRouteSource } from "./source-helpers"

const errorClassLabel: Record<ErrorClass, string> = { parse: "Parse", fetch: "Fetch", permission: "Permission", too_large: "Too large", rate_limited: "Rate limited" }
const statusOptions = [
  { label: "Indexed", value: "indexed" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Failed", value: "failed" },
  { label: "Partial", value: "partial" },
  { label: "Excluded", value: "excluded" },
  { label: "Deleted at source", value: "deleted" },
]

export function SourceItems() {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { source } = useRouteSource()
  const allItems = useMock((s) => s.items)
  const reprocessItem = useMock((s) => s.reprocessItem)
  const excludeItem = useMock((s) => s.excludeItem)
  const syncSource = useMock((s) => s.syncSource)
  const [openId, setOpenId] = useState<string | null>(null)
  const failedOnly = params.get("status") === "failed"

  const sourceItems = useMemo(() => (source ? allItems.filter((i) => i.sourceId === source.id) : []), [allItems, source])
  const data = useMemo(() => (state === "empty" ? [] : failedOnly ? sourceItems.filter((i) => i.status === "failed") : sourceItems), [sourceItems, failedOnly, state])
  const openItem = openId ? allItems.find((i) => i.id === openId) : undefined
  const isFiles = source?.type === "file"

  const reprocess = (rows: Item[]) => { rows.forEach((r) => reprocessItem(r.id)); toast.success(rows.length === 1 ? "Reprocessing item" : `Reprocessing ${rows.length} items`, { description: rows.length === 1 ? rows[0].title : undefined }) }
  const exclude = (rows: Item[]) => { rows.forEach((r) => excludeItem(r.id)); toast.success(rows.length === 1 ? "Item excluded" : `Excluded ${rows.length} items`, { description: "An exclude rule by path was added to the source settings." }) }

  const columns = useMemo<ColumnDef<Item>[]>(
    () => [
      selectColumn<Item>(),
      {
        accessorKey: "title",
        header: ({ column }) => <SortHeader column={column} title="Title" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 max-w-[240px] items-center gap-2">
            <MimeIcon mime={row.original.mimeType} />
            <span className="truncate font-medium">{row.original.title}</span>
          </div>
        ),
        filterFn: (row, _id, value: string) => `${row.original.title} ${row.original.path} ${row.original.url ?? ""}`.toLowerCase().includes(value.toLowerCase()),
      },
      {
        id: "path",
        accessorFn: (r) => r.url ?? r.path,
        header: "Path or URL",
        cell: ({ row }) => {
          const v = row.original.url ?? row.original.path
          return (
            <div className="flex min-w-0 max-w-[190px] items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="truncate font-mono text-xs text-muted-foreground" title={v}>{v}</span>
              <CopyButton text={v} iconOnly variant="ghost" label="Copy path" className="size-7 shrink-0" />
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ItemStatusBadge status={row.original.status} />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      { accessorKey: "chunkCount", header: ({ column }) => <SortHeader column={column} title="Chunks" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="tabular-nums">{num(row.original.chunkCount)}</span> },
      { accessorKey: "sizeBytes", header: ({ column }) => <SortHeader column={column} title="Size" align="right" />, meta: { align: "right" }, cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{bytes(row.original.sizeBytes)}</span> },
      { accessorKey: "modifiedAt", header: ({ column }) => <SortHeader column={column} title="Modified at source" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{shortDate(row.original.modifiedAt)}</span> },
      { id: "processedAt", accessorFn: (r) => r.processedAt ?? "", header: ({ column }) => <SortHeader column={column} title="Last processed" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.processedAt)}</span> },
      {
        id: "mime",
        accessorFn: (r) => mimeLabel(r.mimeType),
        header: "Type",
        cell: ({ row }) => <span className="font-mono text-xs">{mimeLabel(row.original.mimeType)}</span>,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "errorClass",
        accessorFn: (r) => r.errorClass ?? "none",
        header: "Error",
        cell: ({ row }) =>
          row.original.error ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex max-w-[180px] items-center gap-1.5">
                  {row.original.errorClass && <Badge variant="outline" className="shrink-0 border-destructive/40 font-normal text-destructive">{errorClassLabel[row.original.errorClass]}</Badge>}
                  <span className="truncate text-xs text-muted-foreground">{row.original.error}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">{row.original.error}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const it = row.original
          return (
            <div onClick={(e) => e.stopPropagation()} className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${it.title}`}><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setOpenId(it.id)}><FileSearch className="size-4" /> Open</DropdownMenuItem>
                  <DropdownMenuItem disabled={it.status === "excluded" || it.status === "deleted"} onClick={() => reprocess([it])}><RotateCcw className="size-4" /> Reprocess</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.message("Opening at source", { description: it.url ?? it.path })}><ExternalLink className="size-4" /> Open at source</DropdownMenuItem>
                  {isFiles && <DropdownMenuItem onClick={() => toast.success("Download started", { description: it.title })}><Download className="size-4" /> Download original</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={it.status === "excluded"} onClick={() => exclude([it])}><MinusCircle className="size-4" /> Exclude</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [isFiles], // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (!source) return null
  const mimes = Array.from(new Set(sourceItems.map((i) => mimeLabel(i.mimeType)))).sort()
  const classes = Array.from(new Set(sourceItems.map((i) => i.errorClass).filter(Boolean))) as ErrorClass[]
  const neverSynced = state === "empty" || sourceItems.length === 0

  return (
    <PageStateGate state={state === "empty" ? "ready" : state}>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        pageSize={30}
        searchColumn="title"
        searchPlaceholder="Search title or path…"
        onRowClick={(r) => setOpenId(r.id)}
        rowClassName={(r) => (r.status === "failed" ? "bg-destructive/5" : undefined)}
        filters={[
          { column: "status", title: "Status", options: failedOnly ? statusOptions.filter((o) => o.value === "failed") : statusOptions },
          { column: "mime", title: "MIME type", options: mimes.map((m) => ({ label: m, value: m })) },
          { column: "errorClass", title: "Error class", options: [...classes.map((c) => ({ label: errorClassLabel[c], value: c })), { label: "No error", value: "none" }] },
        ]}
        bulkActions={[
          { label: "Reprocess", icon: RotateCcw, onClick: reprocess },
          { label: "Exclude", icon: MinusCircle, onClick: exclude },
        ]}
        toolbarExtra={
          <>
            {failedOnly && (
              <Badge variant="secondary" className="h-8 gap-1.5 rounded-md px-3 font-normal">
                Showing failed only
                <button type="button" className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground" onClick={() => router.replace(pathname)} aria-label="Clear failed-only filter">
                  · Clear <X className="size-3" />
                </button>
              </Badge>
            )}
            <Button size="sm" variant="outline" className="h-8" onClick={() => toast.success("Export started", { description: `${num(data.length)} items as CSV; the download starts when it is ready.` })}>
              <Download className="size-3.5" /> Export list as CSV
            </Button>
          </>
        }
        emptyState={
          neverSynced ? (
            <div className="rounded-lg border">
              <EmptyState
                icon={FileSearch}
                title="No items yet"
                description="Items are the documents, pages or rows this source fetched. None exist until the first sync runs."
                action={source.status === "revoked" ? { label: "Reconnect first", href: pathname.replace(/\/sources\/.*$/, "/integrations") } : { label: "Sync now", onClick: () => { syncSource(source.id); toast.success("Sync started", { description: source.name }) } }}
              />
            </div>
          ) : (
            <div className="rounded-lg border">
              <EmptyState icon={FileSearch} title="No failed items" description="Every item from this source processed without an error." action={{ label: "Show all items", onClick: () => router.replace(pathname) }} />
            </div>
          )
        }
      />
      <DocumentSheet item={openItem} open={!!openItem} onOpenChange={(o) => !o && setOpenId(null)} />
    </PageStateGate>
  )
}
