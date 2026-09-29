import type { ApiKey, McpToken, OAuthClient } from "../types"
import { ago, daysAgo, inDays } from "./time"

export const MCP_BASE = "https://mcp.docs-ai.example/w/northwind"

export const mcpTokens: McpToken[] = [
  { id: "tok_1", name: "Support bot", prefix: "dai_mcp_7f2k…", scopes: ["knowledge:read", "tools:run"], kbIds: ["kb_support"], principals: ["workspace:*"], createdBy: "Sofia Lindqvist", createdAt: daysAgo(60), expiresAt: inDays(120), lastUsedAt: ago(0.01), status: "active" },
  { id: "tok_2", name: "Priya · Claude desktop", prefix: "dai_mcp_a91c…", scopes: ["knowledge:read", "tools:run", "tools:read"], kbIds: [], principals: ["user:priya@northwind.example"], createdBy: "Priya Raman", createdAt: daysAgo(30), expiresAt: inDays(60), lastUsedAt: ago(2), status: "active" },
  { id: "tok_3", name: "Tom · Cursor", prefix: "dai_mcp_33ab…", scopes: ["knowledge:read"], kbIds: ["kb_lending", "kb_eng"], principals: ["user:tom@northwind.example"], createdBy: "Tom Okafor", createdAt: daysAgo(20), expiresAt: inDays(6), lastUsedAt: ago(26), status: "active" },
  { id: "tok_4", name: "On-call assistant", prefix: "dai_mcp_c0de…", scopes: ["knowledge:read", "tools:run"], kbIds: ["kb_eng"], principals: ["group:Engineering"], createdBy: "Marcus Hale", createdAt: daysAgo(90), expiresAt: inDays(275), lastUsedAt: ago(5), status: "active" },
  { id: "tok_5", name: "Hackday demo", prefix: "dai_mcp_1e11…", scopes: ["knowledge:read"], kbIds: ["kb_all"], principals: ["workspace:*"], createdBy: "Dan Whitfield", createdAt: daysAgo(45), expiresAt: daysAgo(15), lastUsedAt: daysAgo(16), status: "expired" },
  { id: "tok_6", name: "Old ChatGPT connector", prefix: "dai_mcp_9d0f…", scopes: ["knowledge:read", "knowledge:write"], kbIds: [], principals: ["workspace:*"], createdBy: "Priya Raman", createdAt: daysAgo(120), lastUsedAt: daysAgo(70), status: "revoked" },
]

export const oauthClients: OAuthClient[] = [
  { id: "oc_1", clientId: "dai_client_5kq2m8x1", name: "Claude (web and desktop)", redirectUris: ["https://claude.ai/api/mcp/auth_callback"], allowedScopes: ["knowledge:read", "tools:run"], clientType: "public", usersAuthorised: 4, createdAt: daysAgo(80), status: "active" },
  { id: "oc_2", clientId: "dai_client_9tz0pa7c", name: "ChatGPT", redirectUris: ["https://chatgpt.com/connector_platform_oauth_redirect"], allowedScopes: ["knowledge:read"], clientType: "confidential", usersAuthorised: 2, createdAt: daysAgo(50), status: "active" },
  { id: "oc_3", clientId: "dai_client_2b8h4nlr", name: "Developer portal (internal)", redirectUris: ["https://devportal.northwind.internal/oauth/callback", "http://localhost:3000/oauth/callback"], allowedScopes: ["knowledge:read", "tools:read", "tools:run"], clientType: "confidential", usersAuthorised: 19, createdAt: daysAgo(120), status: "active" },
]

export const apiKeys: ApiKey[] = [
  { id: "key_1", name: "sbl-onboarding-prod", prefix: "dai_sk_live_4h…", scopes: ["kb:query", "tools:run"], kbIds: ["kb_lending"], createdBy: "Marcus Hale", createdAt: daysAgo(70), expiresAt: inDays(295), lastUsedAt: ago(0.002) },
  { id: "key_2", name: "help-widget", prefix: "dai_sk_live_c2…", scopes: ["kb:query"], kbIds: ["kb_support"], createdBy: "Sofia Lindqvist", createdAt: daysAgo(88), lastUsedAt: ago(0.05) },
  { id: "key_3", name: "dev-portal-staging", prefix: "dai_sk_test_8m…", scopes: ["kb:query", "kb:write"], kbIds: ["kb_eng"], createdBy: "Dan Whitfield", createdAt: daysAgo(10), expiresAt: inDays(80), lastUsedAt: daysAgo(1) },
]
