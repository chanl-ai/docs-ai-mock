import type { Execution, Integration, Secret, Tool } from "../types"
import { ago, daysAgo, inDays, seeded } from "./time"

export const tools: Tool[] = [
  {
    id: "tool_account_lookup",
    name: "Account lookup",
    slug: "account_lookup",
    description: "Look up a customer account by account number or email. Returns balance, status, product and the primary holder. Use before answering any question about a specific customer's account.",
    type: "rest",
    status: "active",
    version: 7,
    owner: "Marcus Hale",
    inputSchema: [
      { name: "accountNumber", type: "string", required: false, description: "12 digit account number" },
      { name: "email", type: "string", required: false, description: "Primary holder email; used when accountNumber is absent" },
    ],
    outputDescription: "{ accountId, status, product, balance, currency, holder: { name, email } }",
    tags: ["core-banking", "read"],
    requiresConfirmation: false,
    availableToMembers: true,
    consumers: [
      { name: "Workspace assistant", scope: "read" },
      { name: "Support bot (MCP token)", scope: "read", expiresAt: inDays(120) },
      { name: "RM follow-ups", scope: "read", expiresAt: inDays(40) },
    ],
    rest: {
      method: "GET",
      url: "https://core.northwind.internal/v2/accounts?number={{input.accountNumber}}&email={{input.email}}",
      headers: [{ key: "Authorization", value: "Bearer {{secret.CORE_BANKING_TOKEN}}" }, { key: "Accept", value: "application/json" }],
      query: [],
      body: "",
      auth: "secret",
      authRef: "CORE_BANKING_TOKEN",
      timeoutMs: 8000,
      retries: 2,
      responseMapping: [{ field: "accountId", path: "$.data.id" }, { field: "balance", path: "$.data.balances.available" }, { field: "holder", path: "$.data.primaryHolder" }],
    },
    example: { input: { accountNumber: "004512779301" }, output: { accountId: "acc_8f21", status: "open", product: "Everyday chequing", balance: 2410.55, currency: "CAD", holder: { name: "J. Alvarez", email: "j.alvarez@example.com" } } },
    stats7d: { executions: 1_842, successRate: 0.992 },
    updatedAt: daysAgo(4),
  },
  {
    id: "tool_fee_lookup",
    name: "Fee lookup",
    slug: "fee_lookup",
    description: "Return the current fee for a product and band from the fee schedule as structured values. Use for any question with a number in the answer.",
    type: "code",
    status: "active",
    version: 3,
    owner: "Tom Okafor",
    inputSchema: [
      { name: "product", type: "enum", required: true, description: "Product line", enum: ["personal_loan", "small_business_loan", "line_of_credit", "mortgage"] },
      { name: "amount", type: "number", required: true, description: "Principal in CAD" },
      { name: "secured", type: "boolean", required: false, description: "Secured by property" },
    ],
    outputDescription: "{ feePct, min, max, source: { document, row, version } }",
    tags: ["lending", "read"],
    requiresConfirmation: false,
    availableToMembers: true,
    consumers: [{ name: "Workspace assistant", scope: "read" }, { name: "SBL onboarding", scope: "read", expiresAt: inDays(200) }],
    code: {
      language: "python",
      entry: "main.py",
      files: [
        { path: "main.py", content: "import json\nfrom schedule import lookup\n\n\ndef handler(input, ctx):\n    row = lookup(input[\"product\"], input[\"amount\"], input.get(\"secured\", False))\n    return {\n        \"feePct\": row.pct,\n        \"min\": row.min,\n        \"max\": row.max,\n        \"source\": {\"document\": \"Fee schedule 2026 Q3\", \"row\": row.n, \"version\": \"v6.0\"},\n    }\n" },
        { path: "schedule.py", content: "from dataclasses import dataclass\n\n@dataclass\nclass Row:\n    n: int; pct: float; min: int; max: int\n\nROWS = {\n    (\"small_business_loan\", False): Row(14, 0.75, 1500, 7500),\n    (\"small_business_loan\", True): Row(15, 0.50, 1000, 5000),\n}\n\ndef lookup(product, amount, secured):\n    return ROWS.get((product, secured), Row(0, 0.0, 0, 0))\n" },
        { path: "requirements.txt", content: "" },
      ],
      secrets: [],
      deployedVersion: 3,
    },
    example: { input: { product: "small_business_loan", amount: 300000, secured: false }, output: { feePct: 0.75, min: 1500, max: 7500, source: { document: "Fee schedule 2026 Q3", row: 14, version: "v6.0" } } },
    stats7d: { executions: 640, successRate: 1 },
    updatedAt: daysAgo(9),
  },
  {
    id: "tool_case_create",
    name: "Create support case",
    slug: "create_support_case",
    description: "Open a case in the case management system with a subject, body and priority. The assistant must confirm with the person before running this.",
    type: "rest",
    status: "active",
    version: 4,
    owner: "Sofia Lindqvist",
    integrationType: "zendesk",
    inputSchema: [
      { name: "subject", type: "string", required: true, description: "Short subject line" },
      { name: "body", type: "string", required: true, description: "Case description" },
      { name: "priority", type: "enum", required: false, description: "Priority", enum: ["low", "normal", "high", "urgent"] },
      { name: "requesterEmail", type: "string", required: true, description: "Customer email" },
    ],
    outputDescription: "{ caseId, url, status }",
    tags: ["support", "write"],
    requiresConfirmation: true,
    availableToMembers: true,
    consumers: [{ name: "Workspace assistant", scope: "create_no_delete" }, { name: "Support bot (MCP token)", scope: "create_no_delete", expiresAt: inDays(120) }],
    rest: {
      method: "POST",
      url: "https://northwind.zendesk.com/api/v2/tickets.json",
      headers: [{ key: "Content-Type", value: "application/json" }],
      query: [],
      body: '{ "ticket": { "subject": "{{input.subject}}", "comment": { "body": "{{input.body}}" }, "priority": "{{input.priority}}", "requester": { "email": "{{input.requesterEmail}}" } } }',
      auth: "integration",
      authRef: "int_zendesk",
      timeoutMs: 10000,
      retries: 1,
      responseMapping: [{ field: "caseId", path: "$.ticket.id" }, { field: "url", path: "$.ticket.url" }, { field: "status", path: "$.ticket.status" }],
    },
    example: { input: { subject: "Card declined abroad", body: "Customer's card declined in Lisbon on 12 Sept", priority: "high", requesterEmail: "j.alvarez@example.com" }, output: { caseId: 48211, url: "https://northwind.zendesk.com/agent/tickets/48211", status: "new" } },
    stats7d: { executions: 212, successRate: 0.948 },
    updatedAt: daysAgo(2),
  },
  {
    id: "tool_registry_lookup",
    name: "Business registry lookup",
    slug: "business_registry_lookup",
    description: "Verify a business number against the federal corporate registry and return the legal name, status and directors.",
    type: "rest",
    status: "active",
    version: 2,
    owner: "Tom Okafor",
    inputSchema: [{ name: "businessNumber", type: "string", required: true, description: "9 digit business number" }],
    outputDescription: "{ legalName, status, incorporatedOn, directors[] }",
    tags: ["kyc", "read"],
    requiresConfirmation: false,
    availableToMembers: false,
    consumers: [{ name: "SBL onboarding", scope: "read", expiresAt: inDays(200) }],
    rest: {
      method: "GET",
      url: "https://api.registry.example/v1/corporations/{{input.businessNumber}}",
      headers: [{ key: "X-Api-Key", value: "{{secret.REGISTRY_API_KEY}}" }],
      query: [],
      body: "",
      auth: "secret",
      authRef: "REGISTRY_API_KEY",
      timeoutMs: 15000,
      retries: 3,
      responseMapping: [{ field: "legalName", path: "$.name" }, { field: "status", path: "$.status" }],
    },
    stats7d: { executions: 88, successRate: 0.909 },
    updatedAt: daysAgo(30),
  },
  {
    id: "tool_docs_extract",
    name: "Extract fields from document",
    slug: "docs_extract",
    description: "Run the document extractor on an uploaded file and return the fields it finds (names, dates, amounts). Used by onboarding flows.",
    type: "code",
    status: "active",
    version: 11,
    owner: "Marcus Hale",
    inputSchema: [
      { name: "fileId", type: "string", required: true, description: "File id from the library" },
      { name: "fields", type: "object", required: false, description: "Field names to extract, with descriptions" },
    ],
    outputDescription: "{ fields: { [name]: { value, confidence, page } } }",
    tags: ["documents", "read"],
    requiresConfirmation: false,
    availableToMembers: false,
    consumers: [{ name: "SBL onboarding", scope: "read", expiresAt: inDays(200) }, { name: "Hardship intake", scope: "read", expiresAt: inDays(90) }],
    code: {
      language: "javascript",
      entry: "index.js",
      files: [
        { path: "index.js", content: "import { extract } from './extractor.js'\n\nexport default async function handler(input, ctx) {\n  const file = await ctx.files.get(input.fileId)\n  const fields = await extract(file, input.fields ?? {}, { model: process.env.EXTRACT_MODEL })\n  return { fields }\n}\n" },
        { path: "extractor.js", content: "export async function extract(file, fields, opts) {\n  // calls the vision model with the page images and a field schema\n  return Object.fromEntries(Object.keys(fields).map((k) => [k, { value: null, confidence: 0, page: 1 }]))\n}\n" },
        { path: "package.json", content: '{ "name": "docs-extract", "type": "module" }' },
      ],
      secrets: ["OPENAI_API_KEY"],
      deployedVersion: 10,
    },
    stats7d: { executions: 301, successRate: 0.973 },
    updatedAt: ago(20),
  },
  {
    id: "tool_slack_notify",
    name: "Notify Slack channel",
    slug: "notify_slack_channel",
    description: "Post a message to a Slack channel. Used to escalate to a human team with the conversation attached.",
    type: "rest",
    status: "inactive",
    version: 5,
    owner: "Sofia Lindqvist",
    integrationType: "slack",
    inputSchema: [
      { name: "channel", type: "string", required: true, description: "Channel name, e.g. #inc-payments" },
      { name: "text", type: "string", required: true, description: "Message text" },
    ],
    outputDescription: "{ ts, channel }",
    tags: ["communication", "write"],
    requiresConfirmation: true,
    availableToMembers: true,
    consumers: [],
    rest: {
      method: "POST",
      url: "https://slack.com/api/chat.postMessage",
      headers: [{ key: "Content-Type", value: "application/json" }],
      query: [],
      body: '{ "channel": "{{input.channel}}", "text": "{{input.text}}" }',
      auth: "integration",
      authRef: "int_slack",
      timeoutMs: 5000,
      retries: 1,
      responseMapping: [{ field: "ts", path: "$.ts" }],
    },
    stats7d: { executions: 0, successRate: 0 },
    updatedAt: daysAgo(40),
  },
  {
    id: "tool_rate_calc",
    name: "Rate quote calculator",
    slug: "rate_quote_calculator",
    description: "Compute an indicative rate and monthly payment from the rate card for a product, amount and term.",
    type: "code",
    status: "draft",
    version: 1,
    owner: "Tom Okafor",
    inputSchema: [
      { name: "product", type: "string", required: true, description: "Product" },
      { name: "amount", type: "number", required: true, description: "Principal" },
      { name: "termMonths", type: "number", required: true, description: "Term in months" },
    ],
    outputDescription: "{ ratePct, monthlyPayment, rateCardVersion }",
    tags: ["lending"],
    requiresConfirmation: false,
    availableToMembers: false,
    consumers: [],
    code: { language: "python", entry: "main.py", files: [{ path: "main.py", content: "def handler(input, ctx):\n    raise NotImplementedError\n" }], secrets: [] },
    stats7d: { executions: 3, successRate: 0 },
    updatedAt: daysAgo(1),
  },
]

// ---- Executions -----------------------------------------------------------

export function buildExecutions(): Execution[] {
  const rnd = seeded(7)
  const out: Execution[] = []
  const triggers: Execution["triggeredBy"][] = [
    { kind: "chat", name: "Workspace assistant" },
    { kind: "mcp", name: "Support bot (claude-desktop)" },
    { kind: "api_key", name: "sbl-onboarding-prod" },
    { kind: "member", name: "Tom Okafor" },
    { kind: "test", name: "Marcus Hale" },
  ]
  const pool = tools.filter((t) => t.status !== "draft")
  for (let i = 0; i < 160; i++) {
    const tool = pool[Math.floor(rnd() * pool.length)]
    const trig = triggers[Math.floor(rnd() * triggers.length)]
    const failed = rnd() > 0.94
    const startedAt = ago(rnd() * 24 * 7)
    const input = tool.example?.input ?? { accountNumber: "0045127" + Math.floor(rnd() * 99999) }
    const base: Execution = {
      id: `exec_${(1000 + i).toString(36)}${Math.floor(rnd() * 1e6).toString(36)}`,
      toolId: tool.id,
      toolName: tool.name,
      status: failed ? "failed" : "success",
      startedAt,
      durationMs: Math.floor(120 + rnd() * 2400),
      triggeredBy: trig,
      retries: failed && rnd() > 0.5 ? 1 : 0,
      input,
      output: failed ? undefined : tool.example?.output ?? { ok: true },
      error: failed
        ? tool.type === "rest"
          ? { message: "Upstream returned 503 Service Unavailable after 2 retries", stack: "RestToolError: 503 Service Unavailable\n    at executeRest (rest-runner.ts:212)\n    at runTool (runner.ts:88)" }
          : { message: "KeyError: 'amount'", stack: "Traceback (most recent call last):\n  File \"main.py\", line 6, in handler\n    row = lookup(input[\"product\"], input[\"amount\"])\nKeyError: 'amount'" }
        : undefined,
      request: tool.rest
        ? {
            method: tool.rest.method,
            url: tool.rest.url.replace(/\{\{input\.(\w+)\}\}/g, (_, k) => String((input as Record<string, unknown>)[k] ?? "")),
            headers: Object.fromEntries(tool.rest.headers.map((h) => [h.key, h.value.includes("secret.") ? "••••••••" : h.value])),
            body: tool.rest.body ? tool.rest.body.replace(/\{\{input\.(\w+)\}\}/g, (_, k) => String((input as Record<string, unknown>)[k] ?? "")) : undefined,
            responseStatus: failed ? 503 : tool.rest.method === "POST" ? 201 : 200,
            responseBody: failed ? '{"error":"service_unavailable"}' : JSON.stringify(tool.example?.output ?? { ok: true }, null, 2),
          }
        : undefined,
      logs: tool.code ? ["[info] loading " + tool.code.entry, "[info] input keys: " + Object.keys(input).join(", "), failed ? "[error] KeyError: 'amount'" : "[info] done in " + Math.floor(120 + rnd() * 900) + " ms"] : undefined,
      threadId: trig.kind === "chat" ? "th_1" : undefined,
      tokenName: trig.kind === "mcp" ? "Support bot" : undefined,
    }
    out.push(base)
  }
  // one running and one pending near the top
  out.unshift({
    id: "exec_running1",
    toolId: "tool_docs_extract",
    toolName: "Extract fields from document",
    status: "running",
    startedAt: ago(0.002),
    durationMs: 0,
    triggeredBy: { kind: "api_key", name: "sbl-onboarding-prod" },
    retries: 0,
    input: { fileId: "file_contract_3", fields: { effectiveDate: "date the agreement starts", term: "length of term" } },
    logs: ["[info] loading index.js", "[info] rendering 24 pages", "[info] calling extractor…"],
  })
  return out.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
}

// ---- Secrets --------------------------------------------------------------

export const secrets: Secret[] = [
  { id: "sec_1", name: "CORE_BANKING_TOKEN", type: "bearer", description: "Service token for the core banking read API", isActive: true, expiresAt: inDays(5), lastUsedAt: ago(0.01), tags: ["core-banking"], usedByToolIds: ["tool_account_lookup"], usedBySourceIds: [], createdAt: daysAgo(85) },
  { id: "sec_2", name: "REGISTRY_API_KEY", type: "api_key", description: "Corporate registry API key", isActive: true, expiresAt: inDays(200), lastUsedAt: ago(4), tags: ["kyc"], usedByToolIds: ["tool_registry_lookup"], usedBySourceIds: [], createdAt: daysAgo(30) },
  { id: "sec_3", name: "OPENAI_API_KEY", type: "api_key", description: "Model provider key for extraction and synthesis", isActive: true, lastUsedAt: ago(0.05), tags: ["provider"], usedByToolIds: ["tool_docs_extract"], usedBySourceIds: [], createdAt: daysAgo(180) },
  { id: "sec_4", name: "INTRANET_BASIC_AUTH", type: "basic", description: "Header auth for intranet URL sources", isActive: true, expiresAt: inDays(60), lastUsedAt: daysAgo(2), tags: ["sources"], usedByToolIds: [], usedBySourceIds: ["src_pricing_crawl"], createdAt: daysAgo(70) },
  { id: "sec_5", name: "SHAREPOINT_CLIENT_CERT", type: "custom", description: "App-only certificate for the SharePoint connection", isActive: true, expiresAt: inDays(300), lastUsedAt: ago(0.2), tags: ["sources", "sharepoint"], usedByToolIds: [], usedBySourceIds: ["src_hr_sharepoint"], createdAt: daysAgo(180) },
  { id: "sec_6", name: "LEGACY_CRM_TOKEN", type: "bearer", description: "Old CRM token, replaced by the HubSpot integration", isActive: false, expiresAt: daysAgo(12), lastUsedAt: daysAgo(40), tags: ["crm"], usedByToolIds: [], usedBySourceIds: [], createdAt: daysAgo(300) },
  { id: "sec_7", name: "SENDGRID_KEY", type: "api_key", description: "Transactional email", isActive: true, lastUsedAt: daysAgo(3), tags: ["email"], usedByToolIds: [], usedBySourceIds: [], createdAt: daysAgo(120), maxUses: 10000 },
]

// ---- Integrations ---------------------------------------------------------

const t = (name: string, description: string, kind: "read" | "write", enabled = kind === "read") => ({ name, description, kind, enabled })

export const integrations: Integration[] = [
  { id: "int_sharepoint", type: "sharepoint", name: "SharePoint / OneDrive", category: "Documents and wikis", description: "Sites, libraries and folders as knowledge sources with inherited permissions.", knowledge: true, tools: false, authMethod: "certificate", status: "connected", connectedAs: "northwind.sharepoint.com (app-only)", connectedBy: "Priya Raman", connectedAt: daysAgo(180), scopes: ["Sites.Read.All", "Files.Read.All"], availableTools: [], lastCallAt: ago(0.2), calls7d: 14 },
  { id: "int_confluence", type: "confluence", name: "Confluence", category: "Documents and wikis", description: "Spaces and pages, with space and page restrictions mirrored.", knowledge: true, tools: false, authMethod: "oauth", status: "needs_reauth", connectedAs: "marcus@northwind.example", connectedBy: "Marcus Hale", connectedAt: daysAgo(150), scopes: ["read:confluence-content.all", "read:confluence-space.summary"], availableTools: [], lastCallAt: ago(9), calls7d: 3 },
  { id: "int_gdrive", type: "gdrive", name: "Google Drive", category: "Documents and wikis", description: "Shared drives and folders; Docs, Sheets and Slides exported to text.", knowledge: true, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("gdrive.search_files", "Search files by name or content", "read"), t("gdrive.read_file", "Read a file's text", "read"), t("gdrive.create_doc", "Create a Google Doc", "write")], calls7d: 0 },
  { id: "int_github", type: "github", name: "GitHub", category: "Code", description: "Repositories, branches and path globs as knowledge sources; issues and PRs as tools.", knowledge: true, tools: true, authMethod: "oauth", status: "connected", connectedAs: "northwind-org (GitHub app)", connectedBy: "Marcus Hale", connectedAt: daysAgo(140), scopes: ["contents:read", "metadata:read", "issues:write"], availableTools: [t("github.search_code", "Search code in connected repos", "read"), t("github.get_file", "Read a file at a ref", "read"), t("github.create_issue", "Open an issue", "write"), t("github.comment_pr", "Comment on a pull request", "write")], lastCallAt: ago(3), calls7d: 41 },
  { id: "int_notion", type: "notion", name: "Notion", category: "Documents and wikis", description: "Pages and databases as knowledge sources.", knowledge: true, tools: true, authMethod: "oauth", status: "connected", connectedAs: "Northwind Product workspace", connectedBy: "Sofia Lindqvist", connectedAt: daysAgo(100), scopes: ["read_content"], availableTools: [t("notion.search", "Search pages", "read"), t("notion.append_block", "Append content to a page", "write")], lastCallAt: daysAgo(14), calls7d: 0 },
  { id: "int_zendesk", type: "zendesk", name: "Zendesk", category: "Support", description: "Help centre articles as a knowledge source; tickets as tools.", knowledge: true, tools: true, authMethod: "api_key", status: "connected", connectedAs: "northwind.zendesk.com", connectedBy: "Sofia Lindqvist", connectedAt: daysAgo(1), availableTools: [t("zendesk.search_tickets", "Search tickets", "read"), t("zendesk.get_ticket", "Read a ticket", "read"), t("zendesk.create_ticket", "Create a ticket", "write", true), t("zendesk.update_ticket", "Update a ticket", "write"), t("zendesk.close_ticket", "Close a ticket", "write")], lastCallAt: ago(1), calls7d: 212 },
  { id: "int_salesforce", type: "salesforce", name: "Salesforce Knowledge", category: "CRM", description: "Knowledge articles by type, category and channel; CRM records as tools.", knowledge: true, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("salesforce.query", "Run a SOQL query", "read"), t("salesforce.create_record", "Create a record", "write"), t("salesforce.update_record", "Update a record", "write")], calls7d: 0 },
  { id: "int_slack", type: "slack", name: "Slack", category: "Communication", description: "Post to channels and read threads the assistant is replying to.", knowledge: false, tools: true, authMethod: "oauth", status: "connected", connectedAs: "northwind.slack.com", connectedBy: "Sofia Lindqvist", connectedAt: daysAgo(64), scopes: ["chat:write", "channels:read"], availableTools: [t("slack.post_message", "Post a message", "write"), t("slack.read_thread", "Read a thread", "read"), t("slack.list_channels", "List channels", "read")], lastCallAt: daysAgo(40), calls7d: 0 },
  { id: "int_hubspot", type: "hubspot", name: "HubSpot", category: "CRM", description: "Contacts, deals and notes.", knowledge: false, tools: true, authMethod: "oauth", status: "connected", connectedAs: "ops@northwind.example", connectedBy: "Priya Raman", connectedAt: daysAgo(120), scopes: ["crm.objects.contacts.read", "crm.objects.deals.write"], availableTools: [t("hubspot.find_contact", "Find a contact", "read"), t("hubspot.get_deal", "Read a deal", "read"), t("hubspot.update_deal", "Move a deal stage", "write"), t("hubspot.create_note", "Log a note", "write")], lastCallAt: ago(30), calls7d: 18 },
  { id: "int_gcal", type: "gcal", name: "Google Calendar", category: "Communication", description: "Check availability and book meetings.", knowledge: false, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("gcal.find_slots", "Find free slots", "read"), t("gcal.create_event", "Create an event", "write")], calls7d: 0 },
  { id: "int_gmail", type: "gmail", name: "Gmail", category: "Communication", description: "Send from a shared mailbox and read threads.", knowledge: false, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("gmail.send_email", "Send an email", "write"), t("gmail.find_thread", "Find a thread", "read")], calls7d: 0 },
  { id: "int_gsheets", type: "gsheets", name: "Google Sheets", category: "Data", description: "Read and append rows.", knowledge: false, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("gsheets.read_range", "Read a range", "read"), t("gsheets.append_row", "Append a row", "write")], calls7d: 0 },
  { id: "int_gdocs", type: "gdocs", name: "Google Docs", category: "Documents and wikis", description: "Create and read documents.", knowledge: false, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("gdocs.read", "Read a doc", "read"), t("gdocs.create", "Create a doc", "write")], calls7d: 0 },
  { id: "int_stripe", type: "stripe", name: "Stripe", category: "Commerce", description: "Look up payments and issue refunds.", knowledge: false, tools: true, authMethod: "api_key", status: "not_connected", availableTools: [t("stripe.get_payment", "Look up a payment", "read"), t("stripe.refund", "Issue a refund", "write")], calls7d: 0 },
  { id: "int_shopify", type: "shopify", name: "Shopify", category: "Commerce", description: "Orders and returns.", knowledge: false, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("shopify.get_order", "Read an order", "read"), t("shopify.create_return", "Start a return", "write")], calls7d: 0 },
  { id: "int_twilio", type: "twilio", name: "Twilio", category: "Communication", description: "Send SMS.", knowledge: false, tools: true, authMethod: "api_key", status: "not_connected", availableTools: [t("twilio.send_sms", "Send an SMS", "write")], calls7d: 0 },
  { id: "int_sendgrid", type: "sendgrid", name: "SendGrid", category: "Communication", description: "Transactional email.", knowledge: false, tools: true, authMethod: "api_key", status: "connected", connectedAs: "api key ending 9f2c", connectedBy: "Marcus Hale", connectedAt: daysAgo(120), availableTools: [t("sendgrid.send", "Send an email", "write")], lastCallAt: daysAgo(3), calls7d: 6 },
  { id: "int_resend", type: "resend", name: "Resend", category: "Communication", description: "Transactional email.", knowledge: false, tools: true, authMethod: "api_key", status: "not_connected", availableTools: [t("resend.send", "Send an email", "write")], calls7d: 0 },
  { id: "int_airtable", type: "airtable", name: "Airtable", category: "Data", description: "Read and write bases.", knowledge: false, tools: true, authMethod: "api_key", status: "not_connected", availableTools: [t("airtable.list_records", "List records", "read"), t("airtable.create_record", "Create a record", "write")], calls7d: 0 },
  { id: "int_linkedin", type: "linkedin", name: "LinkedIn", category: "Communication", description: "Company page posts.", knowledge: false, tools: true, authMethod: "oauth", status: "not_connected", availableTools: [t("linkedin.create_post", "Create a post", "write")], calls7d: 0 },
]
