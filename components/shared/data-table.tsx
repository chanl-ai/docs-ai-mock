"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Row,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { X, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTablePagination } from "@/components/knowledge-base/data-table-pagination"
import { DataTableFacetedFilter } from "@/components/knowledge-base/data-table-faceted-filter"
import { DataTableViewOptions } from "@/components/knowledge-base/data-table-view-options"
import { NoResults } from "./states"
import { cn } from "@/lib/utils"

export interface FacetFilter {
  column: string
  title: string
  options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[]
}

export interface BulkAction<TData> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: "default" | "outline" | "destructive" | "secondary"
  onClick: (rows: TData[]) => void
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumn?: string
  searchPlaceholder?: string
  filters?: FacetFilter[]
  bulkActions?: BulkAction<TData>[]
  getRowId?: (row: TData) => string
  onRowClick?: (row: TData) => void
  rowClassName?: (row: TData) => string | undefined
  emptyState?: React.ReactNode
  toolbarExtra?: React.ReactNode
  initialSorting?: SortingState
  pageSize?: number
  hideViewOptions?: boolean
  hidePagination?: boolean
  dense?: boolean
  className?: string
}

export function selectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" className="translate-y-0.5" />
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" className="translate-y-0.5" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  }
}

/**
 * The standard table: toolbar (search, faceted filters, view options), row selection with bulk
 * actions, sorting, pagination, row click, and a filtered-empty state distinct from empty.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Search…",
  filters = [],
  bulkActions = [],
  getRowId,
  onRowClick,
  rowClassName,
  emptyState,
  toolbarExtra,
  initialSorting = [],
  pageSize = 20,
  hideViewOptions,
  hidePagination,
  dense,
  className,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters },
    initialState: { pagination: { pageSize } },
    enableRowSelection: true,
    getRowId,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isFiltered = table.getState().columnFilters.length > 0
  const selected = table.getFilteredSelectedRowModel().rows.map((r: Row<TData>) => r.original)
  const rows = table.getRowModel().rows
  const showToolbar = searchColumn || filters.length > 0 || toolbarExtra || !hideViewOptions

  if (data.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className={cn("space-y-3", className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && bulkActions.length > 0 ? (
            <>
              <Badge variant="secondary" className="h-8 rounded-md px-3 font-normal">
                {selected.length} selected
              </Badge>
              {bulkActions.map((a) => (
                <Button key={a.label} size="sm" variant={a.variant ?? "outline"} className="h-8" onClick={() => { a.onClick(selected); table.resetRowSelection() }}>
                  {a.icon && <a.icon className="size-3.5" />}
                  {a.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="h-8" onClick={() => table.resetRowSelection()}>
                <X className="size-3.5" /> Clear
              </Button>
            </>
          ) : (
            <>
              {searchColumn && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                  <Input placeholder={searchPlaceholder} value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""} onChange={(e) => table.getColumn(searchColumn)?.setFilterValue(e.target.value)} className="h-8 w-[180px] pl-8 lg:w-[260px]" />
                </div>
              )}
              {filters.map((f) => table.getColumn(f.column) && <DataTableFacetedFilter key={f.column} column={table.getColumn(f.column)} title={f.title} options={f.options} />)}
              {isFiltered && (
                <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()} className="h-8 px-2">
                  Reset <X className="size-3.5" />
                </Button>
              )}
              {toolbarExtra}
            </>
          )}
          {!hideViewOptions && <DataTableViewOptions table={table} />}
        </div>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }} className={cn("whitespace-nowrap", (header.column.columnDef.meta as { align?: string } | undefined)?.align === "right" && "text-right")}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} onClick={onRowClick ? () => onRowClick(row.original) : undefined} className={cn(onRowClick && "cursor-pointer", rowClassName?.(row.original))}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(dense ? "py-1.5" : "py-2.5", (cell.column.columnDef.meta as { align?: string } | undefined)?.align === "right" && "text-right tabular-nums")}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <NoResults onClear={isFiltered ? () => table.resetColumnFilters() : undefined} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!hidePagination && data.length > 10 && <DataTablePagination table={table} />}
    </div>
  )
}

/** Sortable header button for column defs. */
export function SortHeader<TData, TValue>({ column, title, align }: { column: import("@tanstack/react-table").Column<TData, TValue>; title: string; align?: "right" }) {
  if (!column.getCanSort()) return <span className={cn(align === "right" && "block text-right")}>{title}</span>
  const dir = column.getIsSorted()
  return (
    <button type="button" onClick={() => column.toggleSorting(dir === "asc")} className={cn("inline-flex items-center gap-1 hover:text-foreground", align === "right" && "w-full justify-end")}>
      {title}
      <span className="text-[10px] text-muted-foreground">{dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}</span>
    </button>
  )
}
