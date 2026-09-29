import type { AuditEvent } from "../types"
import { ago, seeded } from "./time"

const actors: AuditEvent["actor"][] = [
  { kind: "member", name: "Priya Raman" },
  { kind: "member", name: "Marcus Hale" },
  { kind: "member", name: "Elena Moreau" },
  { kind: "member", name: "Sofia Lindqvist" },
  { kind: "member", name: "Tom Okafor" },
  { kind: "api_key", name: "sbl-onboarding-prod" },
  { kind: "mcp_token", name: "Support bot" },
  { kind: "system", name: "scheduler" },
]

const templates: { action: string; type: string; id: string; name: string; before?: Record<string, unknown>; after?: Record<string, unknown>; actorIdx?: number; failed?: boolean }[] = [
  { action: "synced", type: "source", id: "src_hr_sharepoint", name: "HR policies", actorIdx: 7 },
  { action: "queried", type: "knowledge_base", id: "kb_support", name: "Support docs", actorIdx: 6 },
  { action: "executed", type: "tool", id: "tool_account_lookup", name: "Account lookup", actorIdx: 5 },
  { action: "updated", type: "knowledge_base", id: "kb_lending", name: "Lending policy", actorIdx: 4, before: { "retrieval.threshold": 0.5, "retrieval.temperature": 0.1 }, after: { "retrieval.threshold": 0.65, "retrieval.temperature": 0 } },
  { action: "created", type: "mcp_token", id: "tok_3", name: "Tom · Cursor", actorIdx: 4 },
  { action: "revoked", type: "mcp_token", id: "tok_6", name: "Old ChatGPT connector", actorIdx: 0 },
  { action: "invited", type: "member", id: "inv_1", name: "grace.chen@northwind.example", actorIdx: 0 },
  { action: "sync_failed", type: "source", id: "src_eng_confluence", name: "Engineering handbook", actorIdx: 7, failed: true },
  { action: "updated", type: "source", id: "src_eng_confluence", name: "Engineering handbook", actorIdx: 1, before: { "rules": ["exclude title contains 'Meeting notes'"] }, after: { "rules": ["exclude title contains 'Meeting notes'", "exclude size over 50 MB"] } },
  { action: "created", type: "source", id: "src_zendesk_draft", name: "Help centre articles", actorIdx: 3 },
  { action: "connected", type: "integration", id: "int_zendesk", name: "Zendesk", actorIdx: 3 },
  { action: "uploaded", type: "file", id: "file_root_1", name: "Board pack September 2026.pdf", actorIdx: 0 },
  { action: "deleted", type: "file", id: "file_x", name: "Draft pricing 2027 v0.xlsx", actorIdx: 3 },
  { action: "approved", type: "proposal", id: "pr4", name: "Branch FAQ — append", actorIdx: 3 },
  { action: "rejected", type: "proposal", id: "pr5", name: "Buying cryptocurrency — new page", actorIdx: 3 },
  { action: "role_changed", type: "member", id: "u_elena", name: "Elena Moreau", actorIdx: 0, before: { role: "member" }, after: { role: "admin" } },
  { action: "executed", type: "tool", id: "tool_case_create", name: "Create support case", actorIdx: 6, failed: true },
  { action: "rotated", type: "secret", id: "sec_2", name: "REGISTRY_API_KEY", actorIdx: 1 },
  { action: "updated", type: "settings", id: "security", name: "Security settings", actorIdx: 0, before: { requireExpiry: false }, after: { requireExpiry: true } },
  { action: "refreshed", type: "knowledge_base", id: "kb_all", name: "All company knowledge", actorIdx: 0 },
]

export function buildAudit(): AuditEvent[] {
  const rnd = seeded(99)
  const out: AuditEvent[] = []
  for (let i = 0; i < 240; i++) {
    const t = templates[Math.floor(rnd() * templates.length)]
    const actor = actors[t.actorIdx ?? Math.floor(rnd() * 5)]
    out.push({
      id: `evt_${(1000 + i).toString(36)}${Math.floor(rnd() * 1e5).toString(36)}`,
      at: ago(rnd() * 24 * 30),
      actor,
      action: t.action,
      resource: { type: t.type, id: t.id, name: t.name },
      status: t.failed ? "failed" : "success",
      ip: actor.kind === "system" ? "internal" : `10.4.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}`,
      userAgent: actor.kind === "mcp_token" ? "claude-desktop/1.4.2" : actor.kind === "api_key" ? "docs-ai-python/0.9.1" : "Mozilla/5.0 (Macintosh) Chrome/140",
      requestId: `req_${Math.floor(rnd() * 1e9).toString(36)}`,
      before: t.before,
      after: t.after,
    })
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1))
}
