// Docs AI mock domain types. One file so every screen reads the same shapes.

export type Role = "owner" | "admin" | "member"

export interface User {
  id: string
  name: string
  email: string
  avatarColor?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: "Free" | "Team" | "Business"
  storageQuotaBytes: number
  storageUsedBytes: number
  memberCount: number
  role: Role
  timezone: string
  createdAt: string
}

export interface Member {
  userId: string
  name: string
  email: string
  role: Role
  joinedAt: string
  lastActiveAt: string
}

export interface Invitation {
  id: string
  email: string
  role: Role
  invitedBy: string
  sentAt: string
  expiresAt: string
  status: "pending" | "expired"
}

export interface Group {
  id: string
  name: string
  memberCount: number
  lastSyncedAt: string
}

export type Sensitivity = "internal" | "confidential" | "restricted"

export type SourceType =
  | "file"
  | "url"
  | "crawl"
  | "text"
  | "sharepoint"
  | "confluence"
  | "gdrive"
  | "github"
  | "notion"
  | "zendesk"
  | "salesforce"

export type SourceStatus = "active" | "paused" | "draft" | "revoked"
export type RunStatus = "success" | "partial" | "failed" | "running" | "backing_off"
export type Schedule =
  | { kind: "manual" }
  | { kind: "daily"; time: string }
  | { kind: "weekly"; day: string; time: string }
  | { kind: "monthly"; day: number; time: string }
  | { kind: "webhook"; safetyNetDaily: boolean }

export type ChunkStrategy = "structure" | "topics" | "faq" | "headers" | "summarise" | "rows"

export interface ParsingSettings {
  ocr: boolean
  tables: boolean
  vision: boolean
  removeHtml: boolean
}

export interface ChunkingSettings {
  strategy: ChunkStrategy
  size: number
  overlap: number
  language: string
}

export interface Rule {
  id: string
  kind: "include" | "exclude"
  field: "path" | "title" | "mime" | "modifiedAfter" | "sizeUnder"
  value: string
}

export interface MetadataMapping {
  key: string
  from: string // "static:en" | "field:Dept" | ...
}

export type Permissions =
  | { mode: "inherit" }
  | { mode: "workspace" }
  | { mode: "selected"; principals: string[] }

export interface Source {
  id: string
  workspaceId: string
  type: SourceType
  name: string
  connectionId?: string
  connectionLabel?: string
  scopeSummary: string
  config: Record<string, unknown>
  parsing: ParsingSettings
  chunking: ChunkingSettings
  rules: Rule[]
  metadataMapping: MetadataMapping[]
  tags: string[]
  titleFrom: "source" | "heading" | "filename"
  permissions: Permissions
  schedule: Schedule
  deletedAtSource: "remove" | "keep_stale"
  staleAfterDays: number
  notifyOnFailure: boolean
  sensitivity: Sensitivity
  collection: string // department / collection boundary
  owner: string // member name
  status: SourceStatus
  itemsIndexed: number
  itemsFailed: number
  itemsPending: number
  lastSyncAt?: string
  lastRunStatus?: RunStatus
  lastRunDurationSec?: number
  nextSyncAt?: string
  cursor?: string
  usedByKbIds: string[]
  createdAt: string
  reprocessPending?: boolean
}

export type ItemStatus =
  | "indexed"
  | "pending"
  | "processing"
  | "failed"
  | "partial"
  | "excluded"
  | "deleted"

export type ErrorClass = "parse" | "fetch" | "permission" | "too_large" | "rate_limited"

export interface Chunk {
  index: number
  tokens: number
  location: string
  kind: "content" | "question" | "answer" | "summary" | "row"
  text: string
}

export interface Revision {
  n: number
  author: string
  date: string
  sizeDelta: number
  note?: string
}

export interface Item {
  id: string
  sourceId: string
  externalId: string
  title: string
  mimeType: string
  path: string
  url?: string
  modifiedAt: string
  processedAt?: string
  sizeBytes: number
  status: ItemStatus
  errorClass?: ErrorClass
  error?: string
  chunkCount: number
  tags: string[]
  metadata: Record<string, string>
  acl: string[]
  // Governance fields from the knowledge requirements
  owner: string
  version: string
  effectiveDate: string
  supersedes?: string
  reviewBy: string
  sensitivity: Sensitivity
  collection: string
  verified: boolean
  queries30d: number
  pageCount?: number
  fileId?: string
}

// Heavy per-item content, generated on demand rather than stored.
export interface ItemDetail {
  content: string
  chunks: Chunk[]
  revisions: Revision[]
}

export interface RunPhase {
  name: "list" | "fetch" | "parse" | "chunk" | "embed" | "upsert"
  durationMs: number
  status: "done" | "running" | "failed" | "skipped"
}

export interface RunError {
  itemId: string
  itemTitle: string
  phase: RunPhase["name"]
  errorClass: ErrorClass
  message: string
}

export interface SyncRun {
  id: string
  sourceId: string
  trigger: "manual" | "schedule" | "webhook" | "full" | "retry"
  startedAt: string
  durationSec: number
  status: RunStatus
  cursorBefore?: string
  cursorAfter?: string
  cursorRejected?: boolean
  counts: {
    listed: number
    unchanged: number
    upserted: number
    deleted: number
    failed: number
    skipped: number
  }
  phases: RunPhase[]
  errors: RunError[]
  log: string[]
  progress?: { done: number; total: number; failed: number }
}

export type SearchMode = "semantic" | "keyword" | "hybrid"
export type CitationStyle = "inline" | "footnotes" | "links" | "none"

export interface MetadataFilter {
  key: string
  op: "equals" | "in" | "not"
  value: string
}

export interface RetrievalSettings {
  searchMode: SearchMode
  rerank: boolean
  reranker: "hosted" | "cross-encoder"
  chunkLimit: number
  threshold: number
  queryRewrite: boolean
  rewriteInstructions: string
  scopeSourceIds: string[] // empty = all
  synthesis: boolean
  model: string
  temperature: number
  maxTokens: number
  instructions: string
  citationStyle: CitationStyle
  includeChunks: boolean
  noAnswerMessage: string
  defaultFilters: MetadataFilter[]
  tagsInclude: string[]
  tagsExclude: string[]
  includeUntagged: boolean
  structuredTables: boolean
}

export type KbHealth = "healthy" | "indexing" | "degraded" | "failed" | "never"

export interface KbSourceLink {
  sourceId: string
  itemsContributed: number
  rules: Rule[]
}

export interface PrecedenceRule {
  id: string
  label: string // e.g. "Bank-wide policy beats departmental"
  winner: string
  loser: string
}

export interface KbAccess {
  members: { mode: "all" | "selected"; principals: string[] }
  anyApiKey: boolean
  mcp: { enabled: boolean; toolName: string }
  publicLink: {
    enabled: boolean
    slug: string
    answerStyle: "chat" | "single"
    password?: string
    rateLimit: 60 | 300 | 1000
    showSourceLinks: boolean
  }
  documentPermissions: "respect" | "workspace"
}

export interface IndexJob {
  id: string
  startedAt: string
  durationSec: number
  processed: number
  failed: number
  status: RunStatus
  trigger: string
}

export interface KnowledgeBase {
  id: string
  workspaceId: string
  name: string
  slug: string
  description: string
  color: string
  sources: KbSourceLink[]
  collections: string[] // department boundaries this KB may read; empty = all
  precedence: PrecedenceRule[]
  retrieval: RetrievalSettings
  access: KbAccess
  automation: "act" | "suggest"
  stats: {
    documents: number
    chunks: number
    failures: number
    stale: number
    queries7d: number
    queriesChange7d: number
    noAnswerRate: number
    medianLatencyMs: number
  }
  health: KbHealth
  healthReasons: string[]
  lastRefreshedAt?: string
  indexing?: { done: number; total: number; taskId: string }
  jobs: IndexJob[]
  createdAt: string
}

export interface Citation {
  n: number
  documentId: string
  title: string
  section: string
  page?: number
  version: string
  snippet: string
  url?: string
  precedenceNote?: string
}

export interface ScoredChunk {
  chunkId: string
  documentId: string
  documentTitle: string
  sourceName: string
  score: number
  location: string
  text: string
  rejected: boolean
  version: string
}

export interface StructuredValue {
  label: string
  value: string
  unit?: string
  from: string
}

export interface PlaygroundAnswer {
  id: string
  question: string
  matchers: string[] // substrings of the question that pick this answer
  answer: string
  citations: Citation[]
  chunks: ScoredChunk[]
  structured?: StructuredValue[]
  followed?: string // which document precedence chose
  noAnswer?: boolean
  retrievalMs: number
  synthesisMs: number
}

export interface TestQuestion {
  id: string
  kbId: string
  question: string
  mustCite: string
  expected?: string
  lastResult?: {
    pass: boolean
    topScore: number
    latencyMs: number
    precision: number
    groundedness: number
    ranAt: string
  }
}

export interface CurationIssue {
  id: string
  kbId: string
  kind: "stale" | "conflict" | "unanswered"
  title: string
  detail: string
  documentIds: string[]
  count?: number
  ownerName: string
  firstSeen: string
  status: "open" | "resolved" | "dismissed"
}

export interface Proposal {
  id: string
  kbId: string
  documentId: string
  documentTitle: string
  kind: "append" | "update" | "new"
  proposedBy: string
  proposerKind: "member" | "agent"
  at: string
  sizeDelta: number
  status: "pending" | "approved" | "rejected"
  note: string
  before: string
  after: string
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
}

export interface FileVersion {
  n: number
  sizeBytes: number
  uploadedBy: string
  at: string
}

export interface FileRecord {
  id: string
  name: string
  folderId: string | null
  sizeBytes: number
  mimeType: string
  version: number
  tags: string[]
  uploadedBy: string
  createdAt: string
  modifiedAt: string
  checksum: string
  versions: FileVersion[]
  usedBySourceIds: string[]
  pageCount?: number
  textPreview?: string
  imageDataUrl?: string
}

export type ToolType = "rest" | "code"
export type ToolStatus = "active" | "inactive" | "draft"

export interface ToolField {
  name: string
  type: "string" | "number" | "boolean" | "enum" | "object"
  required: boolean
  description: string
  enum?: string[]
}

export interface Tool {
  id: string
  name: string
  slug: string
  description: string
  type: ToolType
  status: ToolStatus
  version: number
  owner: string
  integrationType?: string
  inputSchema: ToolField[]
  outputDescription: string
  tags: string[]
  requiresConfirmation: boolean
  availableToMembers: boolean
  consumers: { name: string; scope: "read" | "write" | "create_no_delete"; expiresAt?: string }[]
  rest?: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    url: string
    headers: { key: string; value: string }[]
    query: { key: string; value: string }[]
    body: string
    auth: "none" | "secret" | "integration"
    authRef?: string
    timeoutMs: number
    retries: number
    responseMapping: { field: string; path: string }[]
  }
  code?: {
    language: "python" | "javascript"
    entry: string
    files: { path: string; content: string }[]
    secrets: string[]
    deployedVersion?: number
  }
  example?: { input: Record<string, unknown>; output: Record<string, unknown> }
  stats7d: { executions: number; successRate: number }
  updatedAt: string
}

export type ExecutionStatus = "pending" | "running" | "success" | "failed" | "cancelled"

export interface Execution {
  id: string
  toolId: string
  toolName: string
  status: ExecutionStatus
  startedAt: string
  durationMs: number
  triggeredBy: { kind: "member" | "api_key" | "mcp" | "chat" | "test"; name: string }
  retries: number
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: { message: string; stack?: string }
  request?: {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
    responseStatus: number
    responseBody: string
  }
  logs?: string[]
  threadId?: string
  tokenName?: string
}

export interface Secret {
  id: string
  name: string
  type: "api_key" | "bearer" | "basic" | "custom"
  description: string
  isActive: boolean
  expiresAt?: string
  lastUsedAt?: string
  tags: string[]
  usedByToolIds: string[]
  usedBySourceIds: string[]
  createdAt: string
  maxUses?: number
}

export type IntegrationType =
  | "sharepoint"
  | "confluence"
  | "gdrive"
  | "github"
  | "notion"
  | "zendesk"
  | "salesforce"
  | "gcal"
  | "gmail"
  | "gsheets"
  | "gdocs"
  | "hubspot"
  | "slack"
  | "shopify"
  | "stripe"
  | "linkedin"
  | "twilio"
  | "sendgrid"
  | "resend"
  | "airtable"

export interface IntegrationTool {
  name: string
  description: string
  kind: "read" | "write"
  enabled: boolean
}

export interface Integration {
  id: string
  type: IntegrationType
  name: string
  category: "Documents and wikis" | "Code" | "Support" | "CRM" | "Communication" | "Data" | "Commerce"
  description: string
  knowledge: boolean
  tools: boolean
  authMethod: "oauth" | "api_key" | "certificate"
  status: "connected" | "not_connected" | "needs_reauth"
  connectedAs?: string
  connectedBy?: string
  connectedAt?: string
  scopes?: string[]
  availableTools: IntegrationTool[]
  lastCallAt?: string
  calls7d: number
}

export interface McpToken {
  id: string
  name: string
  prefix: string
  scopes: ("knowledge:read" | "knowledge:write" | "tools:run" | "tools:read")[]
  kbIds: string[] // empty = all
  principals: string[]
  createdBy: string
  createdAt: string
  expiresAt?: string
  lastUsedAt?: string
  status: "active" | "expired" | "revoked"
}

export interface OAuthClient {
  id: string
  clientId: string
  name: string
  redirectUris: string[]
  allowedScopes: string[]
  clientType: "public" | "confidential"
  usersAuthorised: number
  createdAt: string
  status: "active" | "disabled"
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  kbIds: string[]
  createdBy: string
  createdAt: string
  expiresAt?: string
  lastUsedAt?: string
}

export interface AuditEvent {
  id: string
  at: string
  actor: { kind: "member" | "api_key" | "mcp_token" | "system"; name: string }
  action: string
  resource: { type: string; id: string; name: string }
  status: "success" | "failed"
  ip: string
  userAgent: string
  requestId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export interface SeriesPoint {
  date: string
  [key: string]: number | string
}

export interface Analytics {
  queriesPerDay: SeriesPoint[] // { date, queries, noAnswer }
  queriesByCaller: SeriesPoint[] // { date, members, api, mcp, public }
  executionsPerDay: SeriesPoint[] // { date, success, failed }
  queriesPerKb: SeriesPoint[] // { date, [kbId]: n }
  topDocuments: { documentId: string; title: string; citations: number; queries: number }[]
  topQueries: { query: string; count: number; noAnswerShare: number }[]
  noAnswerQueries: { query: string; count: number; lastSeen: string }[]
  topTools: { toolId: string; name: string; executions: number; successRate: number; medianMs: number }[]
  clientsByChannel: { channel: string; requests: number }[]
  clientsByName: { name: string; requests: number }[]
  recentFailures: { executionId: string; toolName: string; message: string; at: string }[]
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  at: string
  citations?: Citation[]
  toolCall?: { toolName: string; input: Record<string, unknown>; output: Record<string, unknown>; status: "success" | "failed"; durationMs: number; executionId: string }
  noAnswer?: boolean
  feedback?: "up" | "down"
  structured?: StructuredValue[]
}

export interface Thread {
  id: string
  title: string
  startedBy: { kind: "member" | "api_key" | "mcp"; name: string }
  channel: "app" | "api" | "mcp" | "public"
  kbIds: string[]
  toolsEnabled: boolean
  messages: ChatMessage[]
  createdAt: string
  lastMessageAt: string
  feedback: { up: number; down: number }
  ownerId: string
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  lastDeliveryAt?: string
  lastDeliveryStatus?: "success" | "failed"
}

export interface WorkspaceSettings {
  providers: { id: "openai" | "anthropic" | "azure" | "custom"; name: string; configured: boolean; keyRef?: string }[]
  defaultChatModel: string
  defaultEmbeddingModel: string
  knowledgeDefaults: {
    chunkSize: number
    overlap: number
    staleAfterDays: number
    retryFailed: boolean
    allowedTypes: string[]
    maxFileMb: number
    maxDocuments: number
  }
  chat: { defaultKbs: "all" | "none" | string[]; toolsByDefault: boolean; assistantName: string }
  security: {
    maxTokenLifetime: string
    requireExpiry: boolean
    membersCanCreateTokens: boolean
    allowedIpRanges: string[]
    allowedEmailDomains: string[]
    requireSso: boolean
    sessionLifetime: string
    conversationRetentionDays: number
    executionRetentionDays: number
    sendTextToProviders: boolean
  }
  notifications: {
    mine: { syncFailures: boolean; staleNudges: boolean; proposals: boolean; digest: boolean; inApp: boolean; email: boolean }
    workspace: { syncFailures: string[]; quota80: string[]; quota100: string[]; expiry: string[]; slackChannel?: string }
  }
  webhooks: Webhook[]
}

export interface Task {
  id: string
  kind: "ingest" | "sync" | "export" | "import" | "delete_all" | "refresh"
  label: string
  done: number
  total: number
  status: "running" | "done" | "failed" | "cancelled"
  startedAt: string
}
