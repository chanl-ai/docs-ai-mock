"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  Analytics, ApiKey, AuditEvent, ChatMessage, CurationIssue, Execution, FileRecord, Folder, Group, Integration,
  Invitation, Item, KnowledgeBase, McpToken, Member, OAuthClient, Proposal, RetrievalSettings, Role, Secret, Source,
  SyncRun, Task, TestQuestion, Thread, Tool, User, Workspace, WorkspaceSettings,
} from "./types"
import * as seed from "./seed"

export const nid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
export const nowIso = () => new Date().toISOString()

export interface MockState {
  hydrated: boolean
  authed: boolean
  user: User
  role: Role
  lastWorkspaceSlug: string
  workspaces: Workspace[]
  members: Member[]
  invitations: Invitation[]
  groups: Group[]
  kbs: KnowledgeBase[]
  sources: Source[]
  items: Item[]
  runs: SyncRun[]
  folders: Folder[]
  files: FileRecord[]
  tools: Tool[]
  executions: Execution[]
  secrets: Secret[]
  integrations: Integration[]
  mcpTokens: McpToken[]
  oauthClients: OAuthClient[]
  apiKeys: ApiKey[]
  audit: AuditEvent[]
  threads: Thread[]
  proposals: Proposal[]
  testQuestions: TestQuestion[]
  curation: CurationIssue[]
  settings: WorkspaceSettings
  tasks: Task[]
  analytics: Analytics
  onboardingDone: boolean

  // auth
  login: (email: string) => void
  logout: () => void
  setRole: (role: Role) => void
  setHydrated: () => void
  resetDemo: () => void
  completeOnboarding: () => void

  // knowledge bases
  createKb: (input: { name: string; description: string; color: string; sourceIds: string[]; preset: "balanced" | "precise" | "raw"; collections?: string[] }) => KnowledgeBase
  updateKb: (id: string, patch: Partial<KnowledgeBase>) => void
  updateRetrieval: (id: string, patch: Partial<RetrievalSettings>) => void
  deleteKb: (id: string) => void
  duplicateKb: (id: string) => KnowledgeBase
  refreshKb: (id: string) => void
  cancelKbJob: (id: string) => void
  retryKbFailed: (id: string) => void
  attachSource: (kbId: string, sourceId: string) => void
  detachSource: (kbId: string, sourceId: string) => void
  setKbSourceRules: (kbId: string, sourceId: string, rules: KnowledgeBase["sources"][number]["rules"]) => void

  // sources and items
  createSource: (input: Partial<Source> & { name: string; type: Source["type"] }, opts?: { sync?: boolean; kbIds?: string[] }) => Source
  updateSource: (id: string, patch: Partial<Source>) => void
  deleteSource: (id: string) => void
  syncSource: (id: string, opts?: { full?: boolean; retry?: boolean }) => void
  cancelRun: (sourceId: string) => void
  pauseSource: (id: string, paused: boolean) => void
  reprocessSource: (id: string) => void
  reprocessItem: (itemId: string) => void
  excludeItem: (itemId: string) => void
  verifyItem: (itemId: string, verified: boolean) => void
  setItemTags: (itemId: string, tags: string[]) => void
  setItemOwner: (itemId: string, owner: string) => void
  addItemsFromFiles: (sourceId: string, fileIds: string[]) => void

  // files
  addFolder: (name: string, parentId: string | null) => Folder
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => boolean
  addFile: (file: Omit<FileRecord, "id" | "versions" | "checksum" | "createdAt" | "modifiedAt" | "version">) => FileRecord
  updateFile: (id: string, patch: Partial<FileRecord>) => void
  moveFiles: (ids: string[], folderId: string | null) => void
  tagFiles: (ids: string[], tags: string[]) => void
  deleteFiles: (ids: string[]) => void
  addFileVersion: (id: string, sizeBytes: number) => void
  restoreFileVersion: (id: string, n: number) => void
  addFilesToSource: (fileIds: string[], sourceId: string) => void
  pruneVersions: (olderThanDays: number) => number

  // tools and executions
  createTool: (input: { name: string; description: string; type: Tool["type"]; language?: "python" | "javascript" }) => Tool
  updateTool: (id: string, patch: Partial<Tool>) => void
  deleteTool: (id: string) => void
  setToolStatus: (id: string, status: Tool["status"]) => void
  duplicateTool: (id: string) => Tool
  deployTool: (id: string) => void
  runTool: (id: string, input: Record<string, unknown>, triggeredBy?: Execution["triggeredBy"]) => Execution
  rerunExecution: (id: string) => Execution | undefined
  cancelExecution: (id: string) => void
  importTools: (defs: { name: string; description: string; method: string; url: string }[], opts: { activate: boolean; prefix: string }) => Tool[]

  // secrets
  createSecret: (input: Omit<Secret, "id" | "createdAt" | "usedByToolIds" | "usedBySourceIds" | "lastUsedAt">) => Secret
  updateSecret: (id: string, patch: Partial<Secret>) => void
  deleteSecret: (id: string) => boolean
  rotateSecret: (id: string) => void

  // integrations
  connectIntegration: (id: string, account: string) => void
  disconnectIntegration: (id: string) => void
  reconnectIntegration: (id: string) => void
  setIntegrationTool: (id: string, toolName: string, enabled: boolean) => void

  // connect
  createToken: (input: { name: string; scopes: McpToken["scopes"]; kbIds: string[]; principals: string[]; expiresInDays?: number }) => { token: McpToken; secret: string }
  revokeToken: (id: string) => void
  renameToken: (id: string, name: string) => void
  createOAuthClient: (input: { name: string; redirectUris: string[]; allowedScopes: string[]; clientType: OAuthClient["clientType"] }) => { client: OAuthClient; secret?: string }
  updateOAuthClient: (id: string, patch: Partial<OAuthClient>) => void
  deleteOAuthClient: (id: string) => void
  createApiKey: (input: { name: string; scopes: string[]; kbIds: string[]; expiresInDays?: number }) => { key: ApiKey; secret: string }
  revokeApiKey: (id: string) => void

  // team
  inviteMembers: (emails: string[], role: Role) => void
  changeRole: (userId: string, role: Role) => void
  removeMember: (userId: string) => void
  cancelInvitation: (id: string) => void
  resendInvitation: (id: string) => void

  // chat
  createThread: (input: { kbIds: string[]; toolsEnabled: boolean; title?: string }) => Thread
  appendMessage: (threadId: string, message: ChatMessage) => void
  updateMessage: (threadId: string, messageId: string, patch: Partial<ChatMessage>) => void
  renameThread: (id: string, title: string) => void
  deleteThread: (id: string) => void
  setFeedback: (threadId: string, messageId: string, feedback: "up" | "down" | undefined) => void

  // proposals, evals, curation
  addProposal: (p: Omit<Proposal, "id" | "at" | "status">) => Proposal
  approveProposal: (id: string) => void
  rejectProposal: (id: string, reason?: string) => void
  addTestQuestion: (q: Omit<TestQuestion, "id">) => TestQuestion
  removeTestQuestion: (id: string) => void
  runTestSet: (kbId: string) => void
  setCurationStatus: (id: string, status: CurationIssue["status"]) => void

  // settings, audit, tasks
  updateSettings: (patch: Partial<WorkspaceSettings>) => void
  updateWorkspace: (patch: Partial<Workspace>) => void
  createWorkspace: (name: string, slug: string) => Workspace
  addAudit: (e: Omit<AuditEvent, "id" | "at" | "ip" | "userAgent" | "requestId">) => void
  startTask: (t: Omit<Task, "id" | "startedAt" | "status" | "done">) => Task
  cancelTask: (id: string) => void
  tick: () => void
}

function initialData() {
  return {
    workspaces: seed.workspaces,
    members: seed.members,
    invitations: seed.invitations,
    groups: seed.groups,
    kbs: seed.kbs,
    sources: seed.sources,
    items: seed.buildItems(),
    runs: seed.runs,
    folders: seed.folders,
    files: seed.files,
    tools: seed.tools,
    executions: seed.buildExecutions(),
    secrets: seed.secrets,
    integrations: seed.integrations,
    mcpTokens: seed.mcpTokens,
    oauthClients: seed.oauthClients,
    apiKeys: seed.apiKeys,
    audit: seed.buildAudit(),
    threads: seed.threads,
    proposals: seed.proposals,
    testQuestions: seed.testQuestions,
    curation: seed.curationIssues,
    settings: seed.settings,
    tasks: [] as Task[],
    analytics: seed.buildAnalytics(),
    onboardingDone: true,
  }
}

const auditFor = (actor: string, action: string, type: string, id: string, name: string): AuditEvent => ({
  id: nid("evt"),
  at: nowIso(),
  actor: { kind: "member", name: actor },
  action,
  resource: { type, id, name },
  status: "success",
  ip: "10.4.12.7",
  userAgent: "Mozilla/5.0 (Macintosh) Chrome/140",
  requestId: nid("req"),
})

export const useMock = create<MockState>()(
  persist(
    (set, get) => {
      const log = (action: string, type: string, id: string, name: string) =>
        set((s) => ({ audit: [auditFor(s.user.name, action, type, id, name), ...s.audit] }))

      return {
        hydrated: false,
        authed: false,
        user: seed.currentUser,
        role: "owner",
        lastWorkspaceSlug: "northwind",
        ...initialData(),

        login: (email) =>
          set({
            authed: true,
            user: { id: "u_priya", name: seed.currentUser.name, email: email || seed.currentUser.email },
          }),
        logout: () => set({ authed: false }),
        setRole: (role) => set({ role }),
        setHydrated: () => set({ hydrated: true }),
        resetDemo: () => set({ ...initialData(), role: "owner" }),
        completeOnboarding: () => set({ onboardingDone: true }),

        // ---- knowledge bases ---------------------------------------------
        createKb: (input) => {
          const preset = seed.retrievalPresets[input.preset]
          const srcs = get().sources.filter((s) => input.sourceIds.includes(s.id))
          const documents = srcs.reduce((n, s) => n + s.itemsIndexed, 0)
          const kb: KnowledgeBase = {
            id: nid("kb"),
            workspaceId: "ws_northwind",
            name: input.name,
            slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
            description: input.description,
            color: input.color,
            sources: srcs.map((s) => ({ sourceId: s.id, itemsContributed: s.itemsIndexed, rules: [] })),
            collections: input.collections ?? Array.from(new Set(srcs.map((s) => s.collection))),
            precedence: [{ id: "p1", label: "Newer effective date beats older", winner: "Newer version", loser: "Superseded version" }],
            retrieval: { ...seed.defaultRetrieval, ...preset },
            access: {
              members: { mode: "all", principals: [] },
              anyApiKey: false,
              mcp: { enabled: true, toolName: `search_${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}` },
              publicLink: { enabled: false, slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), answerStyle: "chat", rateLimit: 300, showSourceLinks: true },
              documentPermissions: srcs.some((s) => s.permissions.mode !== "workspace") ? "respect" : "workspace",
            },
            automation: "suggest",
            stats: { documents, chunks: 0, failures: 0, stale: 0, queries7d: 0, queriesChange7d: 0, noAnswerRate: 0, medianLatencyMs: 0 },
            health: documents > 0 ? "indexing" : "never",
            healthReasons: documents > 0 ? [`Index build running: 0 of ${documents} items`] : ["Never indexed"],
            lastRefreshedAt: undefined,
            indexing: documents > 0 ? { done: 0, total: documents, taskId: nid("task") } : undefined,
            jobs: documents > 0 ? [{ id: nid("job"), startedAt: nowIso(), durationSec: 0, processed: 0, failed: 0, status: "running", trigger: "initial build" }] : [],
            createdAt: nowIso(),
          }
          set((s) => ({
            kbs: [kb, ...s.kbs],
            sources: s.sources.map((src) => (input.sourceIds.includes(src.id) ? { ...src, usedByKbIds: [...src.usedByKbIds, kb.id] } : src)),
          }))
          log("created", "knowledge_base", kb.id, kb.name)
          return kb
        },
        updateKb: (id, patch) => set((s) => ({ kbs: s.kbs.map((k) => (k.id === id ? { ...k, ...patch } : k)) })),
        updateRetrieval: (id, patch) => {
          set((s) => ({ kbs: s.kbs.map((k) => (k.id === id ? { ...k, retrieval: { ...k.retrieval, ...patch } } : k)) }))
          const kb = get().kbs.find((k) => k.id === id)
          if (kb) log("updated", "knowledge_base", id, kb.name)
        },
        deleteKb: (id) => {
          const kb = get().kbs.find((k) => k.id === id)
          set((s) => ({
            kbs: s.kbs.filter((k) => k.id !== id),
            sources: s.sources.map((src) => ({ ...src, usedByKbIds: src.usedByKbIds.filter((k) => k !== id) })),
            mcpTokens: s.mcpTokens.map((t) => ({ ...t, kbIds: t.kbIds.filter((k) => k !== id) })),
            apiKeys: s.apiKeys.map((t) => ({ ...t, kbIds: t.kbIds.filter((k) => k !== id) })),
          }))
          if (kb) log("deleted", "knowledge_base", id, kb.name)
        },
        duplicateKb: (id) => {
          const src = get().kbs.find((k) => k.id === id)!
          const copy: KnowledgeBase = {
            ...src,
            id: nid("kb"),
            name: `${src.name} (copy)`,
            slug: `${src.slug}_copy`,
            access: { ...src.access, mcp: { ...src.access.mcp, toolName: `${src.access.mcp.toolName}_copy` }, publicLink: { ...src.access.publicLink, enabled: false, slug: `${src.access.publicLink.slug}-copy` } },
            stats: { ...src.stats, chunks: 0, queries7d: 0, queriesChange7d: 0 },
            health: "never",
            healthReasons: ["Never indexed; settings and source links copied"],
            indexing: undefined,
            jobs: [],
            lastRefreshedAt: undefined,
            createdAt: nowIso(),
          }
          set((s) => ({ kbs: [copy, ...s.kbs] }))
          log("duplicated", "knowledge_base", copy.id, copy.name)
          return copy
        },
        refreshKb: (id) => {
          set((s) => ({
            kbs: s.kbs.map((k) =>
              k.id === id
                ? {
                    ...k,
                    health: "indexing",
                    healthReasons: [`Index refresh running: 0 of ${k.stats.documents} items`],
                    indexing: { done: 0, total: Math.max(k.stats.documents, 1), taskId: nid("task") },
                    jobs: [{ id: nid("job"), startedAt: nowIso(), durationSec: 0, processed: 0, failed: 0, status: "running", trigger: "manual refresh" }, ...k.jobs],
                  }
                : k
            ),
          }))
          const kb = get().kbs.find((k) => k.id === id)
          if (kb) log("refreshed", "knowledge_base", id, kb.name)
        },
        cancelKbJob: (id) =>
          set((s) => ({
            kbs: s.kbs.map((k) =>
              k.id === id && k.indexing
                ? { ...k, indexing: undefined, health: "degraded", healthReasons: ["Last index refresh was cancelled"], jobs: k.jobs.map((j, i) => (i === 0 && j.status === "running" ? { ...j, status: "failed", trigger: j.trigger + " (cancelled)" } : j)) }
                : k
            ),
          })),
        retryKbFailed: (id) => {
          set((s) => ({
            kbs: s.kbs.map((k) => (k.id === id ? { ...k, stats: { ...k.stats, failures: 0 }, health: k.stats.stale > k.stats.documents * 0.1 ? "degraded" : "healthy", healthReasons: k.stats.stale > 0 ? [`${k.stats.stale} items older than the freshness threshold`] : ["Last refresh succeeded and no failed items"] } : k)),
            items: s.items.map((it) => (it.status === "failed" && s.kbs.find((k) => k.id === id)?.sources.some((l) => l.sourceId === it.sourceId) ? { ...it, status: "indexed", error: undefined, errorClass: undefined, chunkCount: 6 } : it)),
          }))
        },
        attachSource: (kbId, sourceId) =>
          set((s) => {
            const src = s.sources.find((x) => x.id === sourceId)
            return {
              kbs: s.kbs.map((k) => (k.id === kbId && !k.sources.some((l) => l.sourceId === sourceId) ? { ...k, sources: [...k.sources, { sourceId, itemsContributed: src?.itemsIndexed ?? 0, rules: [] }], stats: { ...k.stats, documents: k.stats.documents + (src?.itemsIndexed ?? 0) } } : k)),
              sources: s.sources.map((x) => (x.id === sourceId ? { ...x, usedByKbIds: Array.from(new Set([...x.usedByKbIds, kbId])) } : x)),
            }
          }),
        detachSource: (kbId, sourceId) =>
          set((s) => ({
            kbs: s.kbs.map((k) => {
              if (k.id !== kbId) return k
              const link = k.sources.find((l) => l.sourceId === sourceId)
              return { ...k, sources: k.sources.filter((l) => l.sourceId !== sourceId), stats: { ...k.stats, documents: Math.max(0, k.stats.documents - (link?.itemsContributed ?? 0)) } }
            }),
            sources: s.sources.map((x) => (x.id === sourceId ? { ...x, usedByKbIds: x.usedByKbIds.filter((k) => k !== kbId) } : x)),
          })),
        setKbSourceRules: (kbId, sourceId, rules) =>
          set((s) => ({ kbs: s.kbs.map((k) => (k.id === kbId ? { ...k, sources: k.sources.map((l) => (l.sourceId === sourceId ? { ...l, rules } : l)) } : k)) })),

        // ---- sources -------------------------------------------------------
        createSource: (input, opts) => {
          const src: Source = {
            id: nid("src"),
            workspaceId: "ws_northwind",
            scopeSummary: "",
            config: {},
            parsing: { ocr: false, tables: true, vision: false, removeHtml: true },
            chunking: { strategy: "structure", size: 512, overlap: 50, language: "auto" },
            rules: [],
            metadataMapping: [],
            tags: [],
            titleFrom: "source",
            permissions: { mode: "workspace" },
            schedule: { kind: "manual" },
            deletedAtSource: "remove",
            staleAfterDays: 90,
            notifyOnFailure: true,
            sensitivity: "internal",
            collection: "General",
            owner: get().user.name,
            status: input.status ?? "active",
            itemsIndexed: 0,
            itemsFailed: 0,
            itemsPending: 0,
            usedByKbIds: opts?.kbIds ?? [],
            createdAt: nowIso(),
            ...input,
          }
          set((s) => ({
            sources: [src, ...s.sources],
            kbs: s.kbs.map((k) => (opts?.kbIds?.includes(k.id) ? { ...k, sources: [...k.sources, { sourceId: src.id, itemsContributed: 0, rules: [] }] } : k)),
          }))
          log("created", "source", src.id, src.name)
          if (opts?.sync && src.status !== "draft") get().syncSource(src.id)
          return src
        },
        updateSource: (id, patch) => {
          set((s) => ({ sources: s.sources.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
          const src = get().sources.find((x) => x.id === id)
          if (src) log("updated", "source", id, src.name)
        },
        deleteSource: (id) => {
          const src = get().sources.find((x) => x.id === id)
          set((s) => ({
            sources: s.sources.filter((x) => x.id !== id),
            items: s.items.filter((it) => it.sourceId !== id),
            runs: s.runs.filter((r) => r.sourceId !== id),
            kbs: s.kbs.map((k) => ({ ...k, sources: k.sources.filter((l) => l.sourceId !== id) })),
            files: s.files.map((f) => ({ ...f, usedBySourceIds: f.usedBySourceIds.filter((x) => x !== id) })),
          }))
          if (src) log("deleted", "source", id, src.name)
        },
        syncSource: (id, opts) => {
          const src = get().sources.find((x) => x.id === id)
          if (!src) return
          const total = opts?.retry ? Math.max(src.itemsFailed, 1) : opts?.full ? Math.max(src.itemsIndexed + src.itemsFailed, 12) : Math.max(Math.round((src.itemsIndexed + src.itemsFailed) * 0.06), src.itemsIndexed === 0 ? 12 : 4)
          const run: SyncRun = {
            id: nid("run"),
            sourceId: id,
            trigger: opts?.retry ? "retry" : opts?.full ? "full" : "manual",
            startedAt: nowIso(),
            durationSec: 0,
            status: "running",
            cursorBefore: src.cursor,
            counts: { listed: src.itemsIndexed + src.itemsFailed || total, unchanged: 0, upserted: 0, deleted: 0, failed: 0, skipped: 0 },
            phases: [
              { name: "list", durationMs: 0, status: "running" },
              { name: "fetch", durationMs: 0, status: "skipped" },
              { name: "parse", durationMs: 0, status: "skipped" },
              { name: "chunk", durationMs: 0, status: "skipped" },
              { name: "embed", durationMs: 0, status: "skipped" },
              { name: "upsert", durationMs: 0, status: "skipped" },
            ],
            errors: [],
            log: [`${new Date().toISOString().slice(11, 19)} list: starting ${opts?.full ? "full" : "incremental"} listing`],
            progress: { done: 0, total, failed: 0 },
          }
          set((s) => ({
            runs: [run, ...s.runs],
            sources: s.sources.map((x) => (x.id === id ? { ...x, status: x.status === "draft" ? "active" : x.status, lastRunStatus: "running", reprocessPending: false } : x)),
          }))
          log(opts?.full ? "full_resync" : "synced", "source", id, src.name)
        },
        cancelRun: (sourceId) =>
          set((s) => ({
            runs: s.runs.map((r) => (r.sourceId === sourceId && r.status === "running" ? { ...r, status: "failed", log: [...r.log, "cancelled by user"], progress: undefined } : r)),
            sources: s.sources.map((x) => (x.id === sourceId ? { ...x, lastRunStatus: "failed" } : x)),
          })),
        pauseSource: (id, paused) => {
          set((s) => ({ sources: s.sources.map((x) => (x.id === id ? { ...x, status: paused ? "paused" : "active" } : x)) }))
          const src = get().sources.find((x) => x.id === id)
          if (src) log(paused ? "paused" : "resumed", "source", id, src.name)
        },
        reprocessSource: (id) => {
          get().syncSource(id, { full: true })
        },
        reprocessItem: (itemId) =>
          set((s) => ({ items: s.items.map((it) => (it.id === itemId ? { ...it, status: "processing", error: undefined, errorClass: undefined, processedAt: nowIso() } : it)) })),
        excludeItem: (itemId) =>
          set((s) => {
            const it = s.items.find((x) => x.id === itemId)
            return {
              items: s.items.map((x) => (x.id === itemId ? { ...x, status: "excluded", chunkCount: 0 } : x)),
              sources: s.sources.map((src) => (it && src.id === it.sourceId ? { ...src, rules: [...src.rules, { id: nid("rule"), kind: "exclude", field: "path", value: it.path }], itemsIndexed: Math.max(0, src.itemsIndexed - (it.status === "indexed" ? 1 : 0)), itemsFailed: Math.max(0, src.itemsFailed - (it.status === "failed" ? 1 : 0)) } : src)),
            }
          }),
        verifyItem: (itemId, verified) => set((s) => ({ items: s.items.map((it) => (it.id === itemId ? { ...it, verified, reviewBy: verified ? new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10) : it.reviewBy } : it)) })),
        setItemTags: (itemId, tags) => set((s) => ({ items: s.items.map((it) => (it.id === itemId ? { ...it, tags } : it)) })),
        setItemOwner: (itemId, owner) => set((s) => ({ items: s.items.map((it) => (it.id === itemId ? { ...it, owner } : it)) })),
        addItemsFromFiles: (sourceId, fileIds) => {
          const s = get()
          const src = s.sources.find((x) => x.id === sourceId)
          if (!src) return
          const newItems: Item[] = fileIds
            .map((fid) => s.files.find((f) => f.id === fid))
            .filter((f): f is FileRecord => !!f)
            .map((f, i) => ({
              id: nid("it"),
              sourceId,
              externalId: `file:${f.id}`,
              title: f.name.replace(/\.[a-z0-9]+$/i, ""),
              mimeType: f.mimeType,
              path: f.name,
              modifiedAt: f.modifiedAt,
              sizeBytes: f.sizeBytes,
              status: "pending",
              chunkCount: 0,
              tags: [...src.tags],
              metadata: {},
              acl: ["workspace:*"],
              owner: s.user.name,
              version: `v${f.version}.0`,
              effectiveDate: nowIso().slice(0, 10),
              reviewBy: new Date(Date.now() + src.staleAfterDays * 86400_000).toISOString().slice(0, 10),
              sensitivity: src.sensitivity,
              collection: src.collection,
              verified: false,
              queries30d: 0,
              pageCount: f.pageCount,
              fileId: f.id,
              ...(i === 0 ? {} : {}),
            }))
          set((st) => ({
            items: [...newItems, ...st.items],
            sources: st.sources.map((x) => (x.id === sourceId ? { ...x, itemsPending: x.itemsPending + newItems.length } : x)),
            files: st.files.map((f) => (fileIds.includes(f.id) ? { ...f, usedBySourceIds: Array.from(new Set([...f.usedBySourceIds, sourceId])) } : f)),
          }))
          get().syncSource(sourceId)
        },

        // ---- files ---------------------------------------------------------
        addFolder: (name, parentId) => {
          const folder: Folder = { id: nid("f"), name, parentId }
          set((s) => ({ folders: [...s.folders, folder] }))
          return folder
        },
        renameFolder: (id, name) => set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) })),
        deleteFolder: (id) => {
          const s = get()
          if (s.files.some((f) => f.folderId === id) || s.folders.some((f) => f.parentId === id)) return false
          set({ folders: s.folders.filter((f) => f.id !== id) })
          return true
        },
        addFile: (file) => {
          const rec: FileRecord = {
            ...file,
            id: nid("file"),
            version: 1,
            checksum: `sha256:${Math.random().toString(16).slice(2, 18)}…`,
            createdAt: nowIso(),
            modifiedAt: nowIso(),
            versions: [{ n: 1, sizeBytes: file.sizeBytes, uploadedBy: file.uploadedBy, at: nowIso() }],
          }
          set((s) => ({ files: [rec, ...s.files], workspaces: s.workspaces.map((w) => (w.slug === "northwind" ? { ...w, storageUsedBytes: w.storageUsedBytes + file.sizeBytes } : w)) }))
          log("uploaded", "file", rec.id, rec.name)
          return rec
        },
        updateFile: (id, patch) => set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch, modifiedAt: nowIso() } : f)) })),
        moveFiles: (ids, folderId) => set((s) => ({ files: s.files.map((f) => (ids.includes(f.id) ? { ...f, folderId } : f)) })),
        tagFiles: (ids, tags) => set((s) => ({ files: s.files.map((f) => (ids.includes(f.id) ? { ...f, tags: Array.from(new Set([...f.tags, ...tags])) } : f)) })),
        deleteFiles: (ids) => {
          const s = get()
          const removed = s.files.filter((f) => ids.includes(f.id))
          set({
            files: s.files.filter((f) => !ids.includes(f.id)),
            items: s.items.filter((it) => !it.fileId || !ids.includes(it.fileId)),
            workspaces: s.workspaces.map((w) => (w.slug === "northwind" ? { ...w, storageUsedBytes: Math.max(0, w.storageUsedBytes - removed.reduce((n, f) => n + f.sizeBytes, 0)) } : w)),
          })
          removed.forEach((f) => log("deleted", "file", f.id, f.name))
        },
        addFileVersion: (id, sizeBytes) =>
          set((s) => ({
            files: s.files.map((f) => (f.id === id ? { ...f, version: f.version + 1, sizeBytes, modifiedAt: nowIso(), versions: [...f.versions, { n: f.version + 1, sizeBytes, uploadedBy: s.user.name, at: nowIso() }] } : f)),
            items: s.items.map((it) => (it.fileId === id ? { ...it, status: "processing", error: undefined, errorClass: undefined } : it)),
          })),
        restoreFileVersion: (id, n) =>
          set((s) => ({
            files: s.files.map((f) => {
              if (f.id !== id) return f
              const v = f.versions.find((x) => x.n === n)
              if (!v) return f
              const next = f.version + 1
              return { ...f, version: next, sizeBytes: v.sizeBytes, modifiedAt: nowIso(), versions: [...f.versions, { n: next, sizeBytes: v.sizeBytes, uploadedBy: s.user.name, at: nowIso() }] }
            }),
            items: s.items.map((it) => (it.fileId === id ? { ...it, status: "processing" } : it)),
          })),
        addFilesToSource: (fileIds, sourceId) => get().addItemsFromFiles(sourceId, fileIds),
        pruneVersions: (olderThanDays) => {
          let reclaimed = 0
          const cutoff = Date.now() - olderThanDays * 86400_000
          set((s) => ({
            files: s.files.map((f) => {
              const keep = f.versions.filter((v) => v.n === f.version || new Date(v.at).getTime() > cutoff)
              reclaimed += f.versions.filter((v) => !keep.includes(v)).reduce((n, v) => n + v.sizeBytes, 0)
              return { ...f, versions: keep }
            }),
          }))
          return reclaimed
        },

        // ---- tools ---------------------------------------------------------
        createTool: (input) => {
          const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
          const tool: Tool = {
            id: nid("tool"),
            name: input.name,
            slug,
            description: input.description,
            type: input.type,
            status: "draft",
            version: 1,
            owner: get().user.name,
            inputSchema: [],
            outputDescription: "",
            tags: [],
            requiresConfirmation: false,
            availableToMembers: false,
            consumers: [],
            rest: input.type === "rest" ? { method: "GET", url: "", headers: [], query: [], body: "", auth: "none", timeoutMs: 8000, retries: 1, responseMapping: [] } : undefined,
            code: input.type === "code" ? { language: input.language ?? "python", entry: input.language === "javascript" ? "index.js" : "main.py", files: [{ path: input.language === "javascript" ? "index.js" : "main.py", content: input.language === "javascript" ? "export default async function handler(input, ctx) {\n  return { ok: true }\n}\n" : "def handler(input, ctx):\n    return {\"ok\": True}\n" }], secrets: [] } : undefined,
            stats7d: { executions: 0, successRate: 0 },
            updatedAt: nowIso(),
          }
          set((s) => ({ tools: [tool, ...s.tools] }))
          log("created", "tool", tool.id, tool.name)
          return tool
        },
        updateTool: (id, patch) => {
          set((s) => ({ tools: s.tools.map((t) => (t.id === id ? { ...t, ...patch, version: t.version + 1, updatedAt: nowIso() } : t)) }))
          const t = get().tools.find((x) => x.id === id)
          if (t) log("updated", "tool", id, t.name)
        },
        deleteTool: (id) => {
          const t = get().tools.find((x) => x.id === id)
          set((s) => ({ tools: s.tools.filter((x) => x.id !== id), executions: s.executions.filter((e) => e.toolId !== id) }))
          if (t) log("deleted", "tool", id, t.name)
        },
        setToolStatus: (id, status) => set((s) => ({ tools: s.tools.map((t) => (t.id === id ? { ...t, status, updatedAt: nowIso() } : t)) })),
        duplicateTool: (id) => {
          const src = get().tools.find((t) => t.id === id)!
          const copy: Tool = { ...src, id: nid("tool"), name: `${src.name} (copy)`, slug: `${src.slug}_copy`, status: "draft", version: 1, stats7d: { executions: 0, successRate: 0 }, consumers: [], updatedAt: nowIso() }
          set((s) => ({ tools: [copy, ...s.tools] }))
          return copy
        },
        deployTool: (id) => set((s) => ({ tools: s.tools.map((t) => (t.id === id && t.code ? { ...t, code: { ...t.code, deployedVersion: t.version }, status: t.status === "draft" ? "active" : t.status } : t)) })),
        runTool: (id, input, triggeredBy) => {
          const s = get()
          const tool = s.tools.find((t) => t.id === id)!
          const missing = tool.inputSchema.filter((f) => f.required && (input[f.name] === undefined || input[f.name] === ""))
          const failed = missing.length > 0 || tool.status === "draft" && !tool.example
          const exec: Execution = {
            id: nid("exec"),
            toolId: id,
            toolName: tool.name,
            status: failed ? "failed" : "success",
            startedAt: nowIso(),
            durationMs: Math.floor(150 + Math.random() * 900),
            triggeredBy: triggeredBy ?? { kind: "test", name: s.user.name },
            retries: 0,
            input,
            output: failed ? undefined : tool.example?.output ?? { ok: true, echo: input },
            error: failed ? { message: missing.length ? `Missing required input: ${missing.map((m) => m.name).join(", ")}` : "Tool has no implementation yet", stack: missing.length ? "ValidationError: input does not match schema\n    at validate (runner.ts:41)" : "NotImplementedError\n    at handler (main.py:2)" } : undefined,
            request: tool.rest
              ? {
                  method: tool.rest.method,
                  url: tool.rest.url.replace(/\{\{input\.(\w+)\}\}/g, (_, k) => String(input[k] ?? "")),
                  headers: Object.fromEntries(tool.rest.headers.map((h) => [h.key, h.value.includes("secret.") ? "••••••••" : h.value])),
                  body: tool.rest.body ? tool.rest.body.replace(/\{\{input\.(\w+)\}\}/g, (_, k) => String(input[k] ?? "")) : undefined,
                  responseStatus: failed ? 400 : tool.rest.method === "POST" ? 201 : 200,
                  responseBody: failed ? '{"error":"bad_request"}' : JSON.stringify(tool.example?.output ?? { ok: true }, null, 2),
                }
              : undefined,
            logs: tool.code ? ["[info] loading " + tool.code.entry, "[info] input keys: " + Object.keys(input).join(", "), failed ? "[error] " + (missing.length ? "validation failed" : "NotImplementedError") : "[info] done"] : undefined,
          }
          set((st) => ({
            executions: [exec, ...st.executions],
            tools: st.tools.map((t) => (t.id === id ? { ...t, stats7d: { executions: t.stats7d.executions + 1, successRate: (t.stats7d.successRate * t.stats7d.executions + (failed ? 0 : 1)) / (t.stats7d.executions + 1) } } : t)),
          }))
          log("executed", "tool", id, tool.name)
          return exec
        },
        rerunExecution: (id) => {
          const e = get().executions.find((x) => x.id === id)
          if (!e) return undefined
          return get().runTool(e.toolId, e.input, e.triggeredBy)
        },
        cancelExecution: (id) => set((s) => ({ executions: s.executions.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)) })),
        importTools: (defs, opts) => {
          const created = defs.map((d) => {
            const name = `${opts.prefix}${d.name}`
            const tool: Tool = {
              id: nid("tool"),
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
              description: d.description,
              type: "rest",
              status: opts.activate ? "active" : "draft",
              version: 1,
              owner: get().user.name,
              inputSchema: [],
              outputDescription: "",
              tags: ["imported"],
              requiresConfirmation: d.method !== "GET",
              availableToMembers: false,
              consumers: [],
              rest: { method: d.method as "GET", url: d.url, headers: [], query: [], body: "", auth: "none", timeoutMs: 8000, retries: 1, responseMapping: [] },
              stats7d: { executions: 0, successRate: 0 },
              updatedAt: nowIso(),
            }
            return tool
          })
          set((s) => ({ tools: [...created, ...s.tools] }))
          created.forEach((t) => log("imported", "tool", t.id, t.name))
          return created
        },

        // ---- secrets -------------------------------------------------------
        createSecret: (input) => {
          const sec: Secret = { ...input, id: nid("sec"), createdAt: nowIso(), usedByToolIds: [], usedBySourceIds: [] }
          set((s) => ({ secrets: [sec, ...s.secrets] }))
          log("created", "secret", sec.id, sec.name)
          return sec
        },
        updateSecret: (id, patch) => set((s) => ({ secrets: s.secrets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
        deleteSecret: (id) => {
          const sec = get().secrets.find((x) => x.id === id)
          if (!sec || sec.usedByToolIds.length || sec.usedBySourceIds.length) return false
          set((s) => ({ secrets: s.secrets.filter((x) => x.id !== id) }))
          log("deleted", "secret", id, sec.name)
          return true
        },
        rotateSecret: (id) => {
          set((s) => ({ secrets: s.secrets.map((x) => (x.id === id ? { ...x, isActive: true } : x)) }))
          const sec = get().secrets.find((x) => x.id === id)
          if (sec) log("rotated", "secret", id, sec.name)
        },

        // ---- integrations --------------------------------------------------
        connectIntegration: (id, account) => {
          set((s) => ({ integrations: s.integrations.map((i) => (i.id === id ? { ...i, status: "connected", connectedAs: account, connectedBy: s.user.name, connectedAt: nowIso() } : i)) }))
          const i = get().integrations.find((x) => x.id === id)
          if (i) log("connected", "integration", id, i.name)
        },
        disconnectIntegration: (id) => {
          set((s) => ({
            integrations: s.integrations.map((i) => (i.id === id ? { ...i, status: "not_connected", connectedAs: undefined, connectedBy: undefined, connectedAt: undefined } : i)),
            sources: s.sources.map((src) => (src.connectionId === id ? { ...src, status: "revoked" } : src)),
          }))
          const i = get().integrations.find((x) => x.id === id)
          if (i) log("disconnected", "integration", id, i.name)
        },
        reconnectIntegration: (id) => {
          set((s) => ({
            integrations: s.integrations.map((i) => (i.id === id ? { ...i, status: "connected", connectedAt: nowIso() } : i)),
            sources: s.sources.map((src) => (src.connectionId === id && src.status === "revoked" ? { ...src, status: "active" } : src)),
          }))
          const i = get().integrations.find((x) => x.id === id)
          if (i) log("reconnected", "integration", id, i.name)
        },
        setIntegrationTool: (id, toolName, enabled) =>
          set((s) => ({ integrations: s.integrations.map((i) => (i.id === id ? { ...i, availableTools: i.availableTools.map((t) => (t.name === toolName ? { ...t, enabled } : t)) } : i)) })),

        // ---- connect -------------------------------------------------------
        createToken: (input) => {
          const secret = `dai_mcp_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
          const token: McpToken = {
            id: nid("tok"),
            name: input.name,
            prefix: secret.slice(0, 12) + "…",
            scopes: input.scopes,
            kbIds: input.kbIds,
            principals: input.principals.length ? input.principals : ["workspace:*"],
            createdBy: get().user.name,
            createdAt: nowIso(),
            expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86400_000).toISOString() : undefined,
            status: "active",
          }
          set((s) => ({ mcpTokens: [token, ...s.mcpTokens] }))
          log("created", "mcp_token", token.id, token.name)
          return { token, secret }
        },
        revokeToken: (id) => {
          set((s) => ({ mcpTokens: s.mcpTokens.map((t) => (t.id === id ? { ...t, status: "revoked" } : t)) }))
          const t = get().mcpTokens.find((x) => x.id === id)
          if (t) log("revoked", "mcp_token", id, t.name)
        },
        renameToken: (id, name) => set((s) => ({ mcpTokens: s.mcpTokens.map((t) => (t.id === id ? { ...t, name } : t)) })),
        createOAuthClient: (input) => {
          const client: OAuthClient = { id: nid("oc"), clientId: `dai_client_${Math.random().toString(36).slice(2, 10)}`, ...input, usersAuthorised: 0, createdAt: nowIso(), status: "active" }
          set((s) => ({ oauthClients: [client, ...s.oauthClients] }))
          log("created", "oauth_client", client.id, client.name)
          return { client, secret: input.clientType === "confidential" ? `dai_cs_${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}` : undefined }
        },
        updateOAuthClient: (id, patch) => set((s) => ({ oauthClients: s.oauthClients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        deleteOAuthClient: (id) => {
          const c = get().oauthClients.find((x) => x.id === id)
          set((s) => ({ oauthClients: s.oauthClients.filter((x) => x.id !== id) }))
          if (c) log("deleted", "oauth_client", id, c.name)
        },
        createApiKey: (input) => {
          const secret = `dai_sk_live_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`
          const key: ApiKey = { id: nid("key"), name: input.name, prefix: secret.slice(0, 14) + "…", scopes: input.scopes, kbIds: input.kbIds, createdBy: get().user.name, createdAt: nowIso(), expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86400_000).toISOString() : undefined }
          set((s) => ({ apiKeys: [key, ...s.apiKeys] }))
          log("created", "api_key", key.id, key.name)
          return { key, secret }
        },
        revokeApiKey: (id) => {
          const k = get().apiKeys.find((x) => x.id === id)
          set((s) => ({ apiKeys: s.apiKeys.filter((x) => x.id !== id) }))
          if (k) log("revoked", "api_key", id, k.name)
        },

        // ---- team ----------------------------------------------------------
        inviteMembers: (emails, role) => {
          const invs: Invitation[] = emails.map((email) => ({ id: nid("inv"), email, role, invitedBy: get().user.name, sentAt: nowIso(), expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(), status: "pending" }))
          set((s) => ({ invitations: [...invs, ...s.invitations] }))
          invs.forEach((i) => log("invited", "member", i.id, i.email))
        },
        changeRole: (userId, role) => {
          set((s) => ({ members: s.members.map((m) => (m.userId === userId ? { ...m, role } : m)) }))
          const m = get().members.find((x) => x.userId === userId)
          if (m) log("role_changed", "member", userId, m.name)
        },
        removeMember: (userId) => {
          const m = get().members.find((x) => x.userId === userId)
          set((s) => ({ members: s.members.filter((x) => x.userId !== userId) }))
          if (m) log("removed", "member", userId, m.name)
        },
        cancelInvitation: (id) => set((s) => ({ invitations: s.invitations.filter((i) => i.id !== id) })),
        resendInvitation: (id) => set((s) => ({ invitations: s.invitations.map((i) => (i.id === id ? { ...i, sentAt: nowIso(), expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(), status: "pending" } : i)) })),

        // ---- chat ----------------------------------------------------------
        createThread: (input) => {
          const s = get()
          const th: Thread = { id: nid("th"), title: input.title ?? "New conversation", startedBy: { kind: "member", name: s.user.name }, channel: "app", kbIds: input.kbIds, toolsEnabled: input.toolsEnabled, messages: [], createdAt: nowIso(), lastMessageAt: nowIso(), feedback: { up: 0, down: 0 }, ownerId: s.user.id }
          set((st) => ({ threads: [th, ...st.threads] }))
          return th
        },
        appendMessage: (threadId, message) =>
          set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, message], lastMessageAt: message.at, title: t.messages.length === 0 && message.role === "user" ? message.content.slice(0, 60) : t.title } : t)) })),
        updateMessage: (threadId, messageId, patch) =>
          set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) } : t)) })),
        renameThread: (id, title) => set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, title } : t)) })),
        deleteThread: (id) => set((s) => ({ threads: s.threads.filter((t) => t.id !== id) })),
        setFeedback: (threadId, messageId, feedback) =>
          set((s) => ({
            threads: s.threads.map((t) => {
              if (t.id !== threadId) return t
              const messages = t.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m))
              return { ...t, messages, feedback: { up: messages.filter((m) => m.feedback === "up").length, down: messages.filter((m) => m.feedback === "down").length } }
            }),
          })),

        // ---- proposals, evals, curation ------------------------------------
        addProposal: (p) => {
          const pr: Proposal = { ...p, id: nid("pr"), at: nowIso(), status: "pending" }
          set((s) => ({ proposals: [pr, ...s.proposals] }))
          return pr
        },
        approveProposal: (id) => {
          set((s) => ({ proposals: s.proposals.map((p) => (p.id === id ? { ...p, status: "approved" } : p)) }))
          const p = get().proposals.find((x) => x.id === id)
          if (p) log("approved", "proposal", id, `${p.documentTitle} — ${p.kind}`)
        },
        rejectProposal: (id, reason) => {
          set((s) => ({ proposals: s.proposals.map((p) => (p.id === id ? { ...p, status: "rejected", note: reason ? `${p.note}\n\nRejected: ${reason}` : p.note } : p)) }))
          const p = get().proposals.find((x) => x.id === id)
          if (p) log("rejected", "proposal", id, `${p.documentTitle} — ${p.kind}`)
        },
        addTestQuestion: (q) => {
          const tq: TestQuestion = { ...q, id: nid("tq") }
          set((s) => ({ testQuestions: [...s.testQuestions, tq] }))
          return tq
        },
        removeTestQuestion: (id) => set((s) => ({ testQuestions: s.testQuestions.filter((q) => q.id !== id) })),
        runTestSet: (kbId) =>
          set((s) => ({
            testQuestions: s.testQuestions.map((q) => {
              if (q.kbId !== kbId) return q
              const pass = q.lastResult ? q.lastResult.pass : Math.random() > 0.2
              const topScore = pass ? 0.86 + Math.random() * 0.12 : 0.55 + Math.random() * 0.2
              return { ...q, lastResult: { pass, topScore: Math.round(topScore * 100) / 100, latencyMs: Math.floor(1500 + Math.random() * 1200), precision: Math.round((pass ? 0.9 + Math.random() * 0.09 : 0.55 + Math.random() * 0.2) * 100) / 100, groundedness: Math.round((pass ? 0.93 + Math.random() * 0.06 : 0.7 + Math.random() * 0.15) * 100) / 100, ranAt: nowIso() } }
            }),
          })),
        setCurationStatus: (id, status) => set((s) => ({ curation: s.curation.map((c) => (c.id === id ? { ...c, status } : c)) })),

        // ---- settings, audit, tasks ----------------------------------------
        updateSettings: (patch) => {
          set((s) => ({ settings: { ...s.settings, ...patch } }))
          log("updated", "settings", "workspace", "Workspace settings")
        },
        updateWorkspace: (patch) => set((s) => ({ workspaces: s.workspaces.map((w) => (w.slug === "northwind" || w.id === patch.id ? { ...w, ...patch } : w)) })),
        createWorkspace: (name, slug) => {
          const ws: Workspace = { id: nid("ws"), name, slug, plan: "Free", storageQuotaBytes: 1024 ** 3, storageUsedBytes: 0, memberCount: 1, role: "owner", timezone: "America/Toronto", createdAt: nowIso() }
          set((s) => ({ workspaces: [...s.workspaces, ws] }))
          return ws
        },
        addAudit: (e) => set((s) => ({ audit: [{ ...e, id: nid("evt"), at: nowIso(), ip: "10.4.12.7", userAgent: "Mozilla/5.0 (Macintosh) Chrome/140", requestId: nid("req") }, ...s.audit] })),
        startTask: (t) => {
          const task: Task = { ...t, id: nid("task"), startedAt: nowIso(), status: "running", done: 0 }
          set((s) => ({ tasks: [task, ...s.tasks] }))
          return task
        },
        cancelTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: "cancelled" } : t)) })),

        // Advance every running job by one step. Called on an interval by the shell.
        tick: () => {
          const s = get()
          let changed = false
          const kbs = s.kbs.map((k) => {
            if (!k.indexing) return k
            changed = true
            const step = Math.max(1, Math.ceil(k.indexing.total / 14))
            const done = Math.min(k.indexing.total, k.indexing.done + step)
            if (done >= k.indexing.total) {
              const failures = k.stats.failures
              const health = failures > 0 || k.stats.stale > k.stats.documents * 0.1 ? "degraded" : "healthy"
              return {
                ...k,
                indexing: undefined,
                health,
                healthReasons: health === "healthy" ? ["Last refresh succeeded just now", "No failed or stale items"] : [failures > 0 ? `${failures} items failed to parse` : "", k.stats.stale > 0 ? `${k.stats.stale} items older than the freshness threshold` : ""].filter(Boolean),
                lastRefreshedAt: nowIso(),
                stats: { ...k.stats, chunks: k.stats.chunks || Math.round(k.stats.documents * 15.4) },
                jobs: k.jobs.map((j, i) => (i === 0 && j.status === "running" ? { ...j, status: failures > 0 ? "partial" : "success", processed: k.indexing!.total, failed: failures, durationSec: Math.round((Date.now() - new Date(j.startedAt).getTime()) / 1000) } : j)),
              } as KnowledgeBase
            }
            return { ...k, indexing: { ...k.indexing, done }, healthReasons: [`Index refresh running: ${done} of ${k.indexing.total} items`], jobs: k.jobs.map((j, i) => (i === 0 && j.status === "running" ? { ...j, processed: done } : j)) }
          })

          let sources = s.sources
          let items = s.items
          const runs = s.runs.map((r) => {
            if (r.status !== "running" || !r.progress) return r
            changed = true
            const step = Math.max(1, Math.ceil(r.progress.total / 12))
            const done = Math.min(r.progress.total, r.progress.done + step)
            const phaseIdx = Math.min(5, Math.floor((done / r.progress.total) * 6))
            const phases = r.phases.map((p, i) => ({ ...p, status: i < phaseIdx ? "done" : i === phaseIdx ? "running" : "skipped", durationMs: i <= phaseIdx ? p.durationMs + 900 : 0 })) as SyncRun["phases"]
            const src = sources.find((x) => x.id === r.sourceId)
            const pendingItems = items.filter((it) => it.sourceId === r.sourceId && (it.status === "pending" || it.status === "processing"))
            const log = [...r.log, `${new Date().toISOString().slice(11, 19)} ${phases[phaseIdx].name}: ${done} of ${r.progress.total} items`]
            if (done >= r.progress.total) {
              // One item fails when this is a fresh file ingest, so the retry flow is reachable.
              const failOne = r.trigger === "manual" && pendingItems.length >= 3 && !r.errors.length
              const failedItem = failOne ? pendingItems[pendingItems.length - 1] : undefined
              items = items.map((it) => {
                if (it.sourceId !== r.sourceId) return it
                if (failedItem && it.id === failedItem.id) return { ...it, status: "failed", errorClass: "parse", error: "PDF is encrypted; upload an unlocked copy", chunkCount: 0, processedAt: nowIso() }
                if (it.status === "pending" || it.status === "processing") return { ...it, status: "indexed", chunkCount: it.chunkCount || 6 + Math.floor(Math.random() * 20), processedAt: nowIso(), error: undefined, errorClass: undefined }
                if (r.trigger === "retry" && it.status === "failed") return { ...it, status: "indexed", chunkCount: 6, processedAt: nowIso(), error: undefined, errorClass: undefined }
                return it
              })
              const srcItems = items.filter((it) => it.sourceId === r.sourceId)
              const failed = srcItems.filter((it) => it.status === "failed").length
              const indexed = srcItems.filter((it) => it.status === "indexed").length
              const status: SyncRun["status"] = failed > 0 ? "partial" : "success"
              sources = sources.map((x) => (x.id === r.sourceId ? { ...x, itemsIndexed: indexed || x.itemsIndexed, itemsFailed: failed, itemsPending: 0, lastSyncAt: nowIso(), lastRunStatus: status, lastRunDurationSec: Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000), cursor: `cursor:${Date.now().toString(36)}` } : x))
              return {
                ...r,
                status,
                progress: undefined,
                durationSec: Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000),
                cursorAfter: `cursor:${Date.now().toString(36)}`,
                counts: { ...r.counts, listed: r.counts.listed || r.progress.total, upserted: done - (failedItem ? 1 : 0), failed: failedItem ? 1 : r.trigger === "retry" ? 0 : src?.itemsFailed ?? 0 },
                phases: phases.map((p) => ({ ...p, status: "done" })) as SyncRun["phases"],
                errors: (failedItem ? [{ itemId: failedItem.id, itemTitle: failedItem.title, phase: "parse" as const, errorClass: "parse" as const, message: "PDF is encrypted; upload an unlocked copy" }] : r.trigger === "retry" ? [] : r.errors) as SyncRun["errors"],
                log: [...log, `done: ${status}`],
              }
            }
            if (pendingItems.length) {
              const nProcessing = Math.ceil((done / r.progress.total) * pendingItems.length)
              items = items.map((it) => (it.sourceId === r.sourceId && it.status === "pending" && pendingItems.indexOf(it) < nProcessing ? { ...it, status: "processing" } : it))
            }
            return { ...r, progress: { ...r.progress, done }, phases, log }
          })

          const tasks = s.tasks.map((t) => {
            if (t.status !== "running") return t
            changed = true
            const done = Math.min(t.total, t.done + Math.max(1, Math.ceil(t.total / 10)))
            return { ...t, done, status: done >= t.total ? "done" : "running" } as Task
          })

          // Items marked processing outside a run finish on their own.
          if (items.some((it) => it.status === "processing" && !runs.some((r) => r.sourceId === it.sourceId && r.status === "running"))) {
            changed = true
            items = items.map((it) => (it.status === "processing" && !runs.some((r) => r.sourceId === it.sourceId && r.status === "running") ? { ...it, status: "indexed", chunkCount: it.chunkCount || 8, processedAt: nowIso() } : it))
          }

          if (changed) set({ kbs, runs, sources, items, tasks })
        },
      }
    },
    {
      name: "docs-ai-mock-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        authed: s.authed,
        user: s.user,
        role: s.role,
        lastWorkspaceSlug: s.lastWorkspaceSlug,
        onboardingDone: s.onboardingDone,
        kbs: s.kbs,
        sources: s.sources,
        folders: s.folders,
        files: s.files,
        tools: s.tools,
        secrets: s.secrets,
        integrations: s.integrations,
        mcpTokens: s.mcpTokens,
        oauthClients: s.oauthClients,
        apiKeys: s.apiKeys,
        threads: s.threads,
        proposals: s.proposals,
        testQuestions: s.testQuestions,
        curation: s.curation,
        settings: s.settings,
        members: s.members,
        invitations: s.invitations,
        workspaces: s.workspaces,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)

// Selectors -----------------------------------------------------------------

export const selectWorkspace = (slug: string) => (s: MockState) => s.workspaces.find((w) => w.slug === slug) ?? s.workspaces[0]
export const selectKb = (id: string) => (s: MockState) => s.kbs.find((k) => k.id === id)
export const selectSource = (id: string) => (s: MockState) => s.sources.find((x) => x.id === id)
export const isAdmin = (role: Role) => role === "owner" || role === "admin"
