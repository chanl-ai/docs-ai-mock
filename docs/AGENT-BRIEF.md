# Docs AI mock — build brief for screen agents

Repo: /Users/deangrover/Projects/chanl-v2/docs-ai-mock. Next 15 App Router, React 19, Tailwind 4, shadcn/ui in components/ui. Dev server already runs on http://localhost:3020 (do not restart). Do not run git. Never edit components/ui/*, components/shared/*, lib/mock/*, app/layout.tsx, app/w/[ws]/layout.tsx, components/shell/*. Create files only under your assigned app/w/[ws]/<area>/** and components/<area>/**. Spec sections are in /private/tmp/claude-501/-Users-deangrover-Projects-chanl-v2-chanl-platform/12c19b9d-3e3c-42e7-94b6-494beff6355e/scratchpad/spec.txt (plain text of the HTML spec); grep for the section number (e.g. "7.3 Source detail").

Read first (exemplars of the house pattern): app/w/[ws]/page.tsx, app/w/[ws]/kb/page.tsx, components/knowledge/create-kb-sheet.tsx, components/sources/add-source-wizard.tsx, components/knowledge/document-sheet.tsx.

## Rules
- Compose from components/ui and components/shared. No hand-rolled chips, rows or custom CSS for what a primitive does. Tailwind with the app's tokens only (bg-card, text-muted-foreground, border, etc.); dark mode must keep working (no fixed hex colours).
- Homogeneous sets are rows or a table, never a grid of cards. No nested cards (a Section never contains another Section/Card). Internal padding never larger than the gap between siblings.
- Identifiers (ids, slugs, URLs, tool names, keys) in font-mono text-xs. Never a bare slug as the only label. Numbers right-aligned, tabular-nums (DataTable meta: { align: "right" }).
- Empty state defines the noun and offers the verb (EmptyState). Filtered-empty is "No results match" + Clear filters (DataTable does this). Errors say what happened and what to do (ErrorState).
- No "coming soon" copy. Everything visible works or is not shown.
- Status always has icon + label (StatusBadge family), never colour alone.
- Every page honours ?state=empty|loading|error through usePageState() + <PageStateGate>. Loading = region-shaped skeleton (TableSkeleton/StatSkeleton/FormSkeleton). Admin-only pages wrap content in <AdminOnly> (Member role sees permission denied; switch role via the user menu "View as").
- Responsive: usable at 390px and 1440px. Toolbars wrap (flex-wrap), tables sit in overflow-x-auto (DataTable does), sheets are full width under sm.
- Every copyable value uses CopyButton/CopyableField. Destructive actions use DeleteDialog (typed name only when dependents exist) or ConfirmDialog.
- Sentence case headings. Banned words anywhere visible: Protobox, protobox, Voiceflow, Chanl, TD, Milkyway.
- Mutations go through the zustand store (lib/mock/store.ts, hook useMock). Read its MockState interface for the full action list. Toast with sonner `toast.success/message/error` after mutations.

## Foundation API
- Store: `import { useMock } from "@/lib/mock/store"` — `useMock((s) => s.kbs)` etc. Collections: workspaces, members, invitations, groups, kbs, sources, items, runs, folders, files, tools, executions, secrets, integrations, mcpTokens, oauthClients, apiKeys, audit, threads, proposals, testQuestions, curation, settings, tasks, analytics, user, role. Actions are listed in the MockState interface. Types in lib/mock/types.ts.
- `useWs()` from "@/lib/mock/hooks" → { slug, base, workspace }; every in-app href is `${base}/...`.
- `useRole()` from "@/hooks/use-role" → { role, admin, owner }.
- `usePageState()` from "@/hooks/use-page-state" → "ready" | "empty" | "loading" | "error".
- Format helpers "@/lib/format": relative(iso), shortDate, dateTime, bytes, num, pct, ms, duration(sec), mimeLabel, daysUntil, slugify, snakeify.
- "@/lib/mock/source-types": sourceTypes, sourceTypeMeta(type), <SourceTypeIcon type />, scheduleLabel(schedule).
- "@/lib/mock/answer": findAnswer(question, kb?, settings?) → PlaygroundAnswer; findChatReply(question).
- "@/lib/mock/detail": itemDetail(item) → { content, chunks, revisions }.
- Shared components (components/shared):
  - page-header: <PageHeader title description actions badge scope tabs />
  - states: EmptyState{icon,title,description,action{label,href|onClick},secondaryAction}, ErrorState{title,message,onRetry}, PermissionDenied, NoResults, TableSkeleton, StatSkeleton, FormSkeleton, PageStateGate{state,loading?,error?,empty?,children}
  - stat-tile: StatTile{label,value,hint,tone,href}, StatRow
  - status-badge: StatusBadge{tone,icon,label}, KbHealthBadge, RunStatusBadge, SourceStatusBadge, ItemStatusBadge, ExecutionStatusBadge, ToolStatusBadge, SensitivityBadge, FreshnessBadge{reviewBy}, MimeIcon{mime}
  - data-table: DataTable{columns,data,searchColumn,searchPlaceholder,filters:[{column,title,options}],bulkActions:[{label,icon,variant,onClick(rows)}],getRowId,onRowClick,rowClassName,emptyState,toolbarExtra,initialSorting,pageSize,hideViewOptions,hidePagination,dense}, SortHeader{column,title,align}, selectColumn<T>()
  - surface: Section{title,description,actions,flush,bodyClassName}, Rows, Row{leading,title,description,trailing,href|onClick}, FieldRow{label,value,mono,wrap}, Mono
  - copy: CopyButton{text,label,iconOnly,variant}, CopyableField{value,label,masked}, useCopy()
  - code-sample: CodeSample{tabs:[{id,label,code}]}, CodeBlock{code}
  - dialogs: DeleteDialog{open,onOpenChange,title,objectName,description,dependents:[{kind,names}],consequence,confirmLabel,onConfirm}, ConfirmDialog{open,onOpenChange,title,description,confirmLabel,destructive,onConfirm}
  - stepper: Stepper{steps,current(1-based),onStepClick,orientation}
  - tag-input: TagInput{value,onChange,suggestions,placeholder}
  - role-gate: <AdminOnly>
- Feature components you may reuse: components/knowledge/document-sheet.tsx <DocumentSheet item open onOpenChange />; components/files/file-dropzone.tsx { FileDropzone, UploadRow, rowsFromFiles, sampleRows, useUploadRunner, UploadRowList, ACCEPTED }; components/sources/add-source-wizard.tsx <AddSourceWizard mode="page"|"sheet" onDone initialType />; components/knowledge/kb-dot.tsx KbDot.
- ui extras present: slider, collapsible, radio-group, toggle-group, chart (ChartContainer/ChartTooltip/ChartTooltipContent, recharts 3), command, sheet, drawer, calendar, date-range-picker, selectable-card, accordion, hover-card, scroll-area, progress, switch, tabs, tooltip, textarea, table, avatar, badge, alert, alert-dialog, dialog, dropdown-menu, popover, select, checkbox, input, label, button, separator, skeleton, sonner.

## Verify
1. `npx tsc --noEmit` must be clean (fix your files; ignore nothing).
2. Screenshot: `node scripts/shoot.mjs <outDir> 1440 "/w/northwind/route1,/w/northwind/route2"` and again with 390. Read the PNGs (Read tool) and fix anything clipped, overflowing or broken. Also check `?state=empty`, `?state=loading`, `?state=error` render.
3. Report in under 150 words: routes built, which are fully interactive, anything skipped and why.
