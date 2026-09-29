import type { WorkspaceSettings } from "../types"
import { ago, daysAgo } from "./time"

export const settings: WorkspaceSettings = {
  providers: [
    { id: "openai", name: "OpenAI", configured: true, keyRef: "OPENAI_API_KEY" },
    { id: "anthropic", name: "Anthropic", configured: true, keyRef: "ANTHROPIC_API_KEY" },
    { id: "azure", name: "Azure OpenAI", configured: false },
    { id: "custom", name: "Custom OpenAI-compatible", configured: false },
  ],
  defaultChatModel: "gpt-4o",
  defaultEmbeddingModel: "text-embedding-3-large",
  knowledgeDefaults: {
    chunkSize: 512,
    overlap: 50,
    staleAfterDays: 90,
    retryFailed: true,
    allowedTypes: ["pdf", "docx", "xlsx", "pptx", "csv", "txt", "md", "html"],
    maxFileMb: 50,
    maxDocuments: 50_000,
  },
  chat: { defaultKbs: "all", toolsByDefault: true, assistantName: "Northwind assistant" },
  security: {
    maxTokenLifetime: "1y",
    requireExpiry: true,
    membersCanCreateTokens: true,
    allowedIpRanges: ["10.4.0.0/16", "203.0.113.0/24"],
    allowedEmailDomains: ["northwind.example"],
    requireSso: false,
    sessionLifetime: "14d",
    conversationRetentionDays: 365,
    executionRetentionDays: 90,
    sendTextToProviders: true,
  },
  notifications: {
    mine: { syncFailures: true, staleNudges: true, proposals: true, digest: false, inApp: true, email: true },
    workspace: {
      syncFailures: ["priya@northwind.example", "marcus@northwind.example"],
      quota80: ["priya@northwind.example"],
      quota100: ["priya@northwind.example", "marcus@northwind.example"],
      expiry: ["priya@northwind.example"],
      slackChannel: "#docs-ai-alerts",
    },
  },
  webhooks: [
    { id: "wh_1", url: "https://hooks.northwind.internal/docs-ai", events: ["sync.failed", "proposal.created"], secret: "whsec_9f2k…", lastDeliveryAt: ago(9), lastDeliveryStatus: "success" },
    { id: "wh_2", url: "https://pagerduty.example/integration/abc123", events: ["sync.failed", "execution.failed"], secret: "whsec_c0de…", lastDeliveryAt: daysAgo(1), lastDeliveryStatus: "failed" },
  ],
}

export const models = [
  { provider: "OpenAI", id: "gpt-4o", label: "GPT-4o" },
  { provider: "OpenAI", id: "gpt-4o-mini", label: "GPT-4o mini" },
  { provider: "OpenAI", id: "gpt-5", label: "GPT-5" },
  { provider: "Anthropic", id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { provider: "Anthropic", id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { provider: "Anthropic", id: "claude-opus-4-1", label: "Claude Opus 4.1" },
]
