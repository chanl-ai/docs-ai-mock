import type { ErrorClass, Item, ItemStatus, Sensitivity, Source, SyncRun } from "../types"
import { ago, daysAgo, inHours, inDays, seeded } from "./time"

const defaultParsing = { ocr: false, tables: true, vision: false, removeHtml: true }
const defaultChunking = { strategy: "structure" as const, size: 512, overlap: 50, language: "auto" }

export const sources: Source[] = [
  {
    id: "src_hr_sharepoint",
    workspaceId: "ws_northwind",
    type: "sharepoint",
    name: "HR policies",
    connectionId: "int_sharepoint",
    connectionLabel: "northwind.sharepoint.com (app-only)",
    scopeSummary: "Site: People Operations · Documents/Policies, Documents/Forms",
    config: { site: "People Operations", libraries: ["Documents/Policies", "Documents/Forms"], includeOffice: true, includePdf: true, auth: "app-only" },
    parsing: { ...defaultParsing, ocr: true },
    chunking: defaultChunking,
    rules: [{ id: "r1", kind: "exclude", field: "path", value: "**/Archive/**" }],
    metadataMapping: [
      { key: "department", from: "field:Dept" },
      { key: "locale", from: "static:en" },
      { key: "policy_owner", from: "field:Owner" },
    ],
    tags: ["policy", "hr"],
    titleFrom: "source",
    permissions: { mode: "inherit" },
    schedule: { kind: "daily", time: "02:00" },
    deletedAtSource: "remove",
    staleAfterDays: 90,
    notifyOnFailure: true,
    sensitivity: "internal",
    collection: "HR",
    owner: "Elena Moreau",
    status: "active",
    itemsIndexed: 787,
    itemsFailed: 3,
    itemsPending: 0,
    lastSyncAt: ago(0.2),
    lastRunStatus: "partial",
    lastRunDurationSec: 412,
    nextSyncAt: inHours(12),
    cursor: "delta:MzslMjM7MTsz",
    usedByKbIds: ["kb_people", "kb_all"],
    createdAt: daysAgo(180),
  },
  {
    id: "src_eng_confluence",
    workspaceId: "ws_northwind",
    type: "confluence",
    name: "Engineering handbook",
    connectionId: "int_confluence",
    connectionLabel: "northwind.atlassian.net",
    scopeSummary: "Spaces: ENG, PLAT, SRE · attachments included",
    config: { site: "northwind.atlassian.net", spaces: ["ENG", "PLAT", "SRE"], includeAttachments: true },
    parsing: defaultParsing,
    chunking: { ...defaultChunking, strategy: "headers" },
    rules: [{ id: "r2", kind: "exclude", field: "title", value: "Meeting notes" }],
    metadataMapping: [
      { key: "space", from: "field:Space" },
      { key: "team", from: "field:Label" },
    ],
    tags: ["engineering", "handbook"],
    titleFrom: "source",
    permissions: { mode: "inherit" },
    schedule: { kind: "weekly", day: "Mon", time: "03:00" },
    deletedAtSource: "remove",
    staleAfterDays: 120,
    notifyOnFailure: true,
    sensitivity: "internal",
    collection: "Engineering",
    owner: "Marcus Hale",
    status: "revoked",
    itemsIndexed: 380,
    itemsFailed: 0,
    itemsPending: 0,
    lastSyncAt: ago(9),
    lastRunStatus: "failed",
    lastRunDurationSec: 4,
    nextSyncAt: inDays(4),
    cursor: "modified-since:2026-09-22T03:00:00Z",
    usedByKbIds: ["kb_eng", "kb_all"],
    createdAt: daysAgo(150),
  },
  {
    id: "src_github_docs",
    workspaceId: "ws_northwind",
    type: "github",
    name: "Platform docs repo",
    connectionId: "int_github",
    connectionLabel: "GitHub app · northwind-org",
    scopeSummary: "northwind-org/platform-docs · main · docs/**, **/*.md",
    config: { installation: "northwind-org", repos: ["northwind-org/platform-docs"], branch: "main", globs: ["docs/**", "**/*.md"] },
    parsing: { ...defaultParsing, removeHtml: false },
    chunking: defaultChunking,
    rules: [{ id: "r3", kind: "exclude", field: "path", value: "docs/archive/**" }],
    metadataMapping: [
      { key: "area", from: "field:Path segment 2" },
      { key: "repo", from: "static:platform-docs" },
    ],
    tags: ["docs", "api"],
    titleFrom: "heading",
    permissions: { mode: "workspace" },
    schedule: { kind: "webhook", safetyNetDaily: true },
    deletedAtSource: "remove",
    staleAfterDays: 180,
    notifyOnFailure: true,
    sensitivity: "internal",
    collection: "Engineering",
    owner: "Marcus Hale",
    status: "active",
    itemsIndexed: 214,
    itemsFailed: 0,
    itemsPending: 0,
    lastSyncAt: ago(3),
    lastRunStatus: "success",
    lastRunDurationSec: 38,
    nextSyncAt: inHours(21),
    cursor: "sha:9f3c1e2",
    usedByKbIds: ["kb_eng", "kb_all"],
    createdAt: daysAgo(140),
  },
  {
    id: "src_contracts",
    workspaceId: "ws_northwind",
    type: "file",
    name: "Vendor contracts",
    scopeSummary: "12 files from Files/Legal/Contracts",
    config: { folderId: "f_contracts" },
    parsing: { ...defaultParsing, ocr: true },
    chunking: defaultChunking,
    rules: [],
    metadataMapping: [
      { key: "vendor", from: "field:Filename prefix" },
      { key: "doc_type", from: "static:contract" },
    ],
    tags: ["contract", "legal"],
    titleFrom: "filename",
    permissions: { mode: "selected", principals: ["group:Legal", "user:priya@northwind.example"] },
    schedule: { kind: "manual" },
    deletedAtSource: "remove",
    staleAfterDays: 365,
    notifyOnFailure: false,
    sensitivity: "restricted",
    collection: "Legal",
    owner: "Priya Raman",
    status: "active",
    itemsIndexed: 11,
    itemsFailed: 1,
    itemsPending: 0,
    lastSyncAt: daysAgo(3),
    lastRunStatus: "partial",
    lastRunDurationSec: 96,
    usedByKbIds: ["kb_legal"],
    createdAt: daysAgo(60),
  },
  {
    id: "src_pricing_crawl",
    workspaceId: "ws_northwind",
    type: "crawl",
    name: "Pricing site",
    scopeSummary: "https://www.northwind.example/sitemap-pricing.xml · depth 3 · 200 pages max",
    config: { startUrl: "https://www.northwind.example/sitemap-pricing.xml", depth: 3, maxPages: 200, sameDomain: true, include: ["/pricing/**", "/fees/**"], exclude: ["/pricing/archive/**"], respectRobots: true },
    parsing: { ...defaultParsing, tables: true },
    chunking: { ...defaultChunking, size: 400 },
    rules: [],
    metadataMapping: [
      { key: "product", from: "field:URL path segment 2" },
      { key: "locale", from: "static:en-CA" },
    ],
    tags: ["pricing", "public"],
    titleFrom: "source",
    permissions: { mode: "workspace" },
    schedule: { kind: "daily", time: "05:00" },
    deletedAtSource: "keep_stale",
    staleAfterDays: 30,
    notifyOnFailure: true,
    sensitivity: "internal",
    collection: "Product",
    owner: "Sofia Lindqvist",
    status: "active",
    itemsIndexed: 96,
    itemsFailed: 0,
    itemsPending: 0,
    lastSyncAt: ago(2),
    lastRunStatus: "success",
    lastRunDurationSec: 61,
    nextSyncAt: inHours(15),
    cursor: "etag-set:96",
    usedByKbIds: ["kb_support", "kb_all"],
    createdAt: daysAgo(90),
  },
  {
    id: "src_lending_policies",
    workspaceId: "ws_northwind",
    type: "file",
    name: "Lending policies and fee schedules",
    scopeSummary: "9 files from Files/Lending",
    config: { folderId: "f_lending" },
    parsing: { ...defaultParsing, tables: true },
    chunking: { ...defaultChunking, strategy: "rows" },
    rules: [],
    metadataMapping: [
      { key: "policy_area", from: "field:Filename prefix" },
      { key: "effective", from: "field:Effective date" },
    ],
    tags: ["policy", "lending", "fees"],
    titleFrom: "filename",
    permissions: { mode: "selected", principals: ["group:Lending", "group:Legal"] },
    schedule: { kind: "manual" },
    deletedAtSource: "remove",
    staleAfterDays: 90,
    notifyOnFailure: true,
    sensitivity: "confidential",
    collection: "Lending",
    owner: "Tom Okafor",
    status: "active",
    itemsIndexed: 9,
    itemsFailed: 0,
    itemsPending: 0,
    lastSyncAt: daysAgo(1),
    lastRunStatus: "success",
    lastRunDurationSec: 44,
    usedByKbIds: ["kb_lending", "kb_all"],
    createdAt: daysAgo(75),
  },
  {
    id: "src_branch_faq",
    workspaceId: "ws_northwind",
    type: "text",
    name: "Branch FAQ",
    scopeSummary: "Pasted Markdown · 1 document · 2,140 words",
    config: { format: "markdown" },
    parsing: defaultParsing,
    chunking: { ...defaultChunking, strategy: "faq" },
    rules: [],
    metadataMapping: [{ key: "audience", from: "static:branch-staff" }],
    tags: ["faq"],
    titleFrom: "heading",
    permissions: { mode: "workspace" },
    schedule: { kind: "manual" },
    deletedAtSource: "remove",
    staleAfterDays: 60,
    notifyOnFailure: false,
    sensitivity: "internal",
    collection: "Support",
    owner: "Sofia Lindqvist",
    status: "active",
    itemsIndexed: 1,
    itemsFailed: 0,
    itemsPending: 0,
    lastSyncAt: daysAgo(6),
    lastRunStatus: "success",
    lastRunDurationSec: 9,
    usedByKbIds: ["kb_support"],
    createdAt: daysAgo(30),
  },
  {
    id: "src_zendesk_draft",
    workspaceId: "ws_northwind",
    type: "zendesk",
    name: "Help centre articles",
    connectionId: "int_zendesk",
    connectionLabel: "northwind.zendesk.com",
    scopeSummary: "Categories: Accounts, Cards · en-ca · published only",
    config: { subdomain: "northwind", categories: ["Accounts", "Cards"], locales: ["en-ca"], publishedOnly: true },
    parsing: defaultParsing,
    chunking: defaultChunking,
    rules: [],
    metadataMapping: [],
    tags: ["help-centre"],
    titleFrom: "source",
    permissions: { mode: "workspace" },
    schedule: { kind: "daily", time: "04:00" },
    deletedAtSource: "remove",
    staleAfterDays: 90,
    notifyOnFailure: true,
    sensitivity: "internal",
    collection: "Support",
    owner: "Sofia Lindqvist",
    status: "draft",
    itemsIndexed: 0,
    itemsFailed: 0,
    itemsPending: 0,
    usedByKbIds: [],
    createdAt: daysAgo(1),
  },
  {
    id: "src_notion_product",
    workspaceId: "ws_northwind",
    type: "notion",
    name: "Product wiki",
    connectionId: "int_notion",
    connectionLabel: "Northwind Product (Notion)",
    scopeSummary: "Pages: Product wiki, Roadmap · child pages included",
    config: { pages: ["Product wiki", "Roadmap"], includeChildren: true },
    parsing: defaultParsing,
    chunking: { ...defaultChunking, strategy: "topics" },
    rules: [],
    metadataMapping: [{ key: "space", from: "static:product" }],
    tags: ["product"],
    titleFrom: "source",
    permissions: { mode: "workspace" },
    schedule: { kind: "daily", time: "06:00" },
    deletedAtSource: "keep_stale",
    staleAfterDays: 60,
    notifyOnFailure: false,
    sensitivity: "internal",
    collection: "Product",
    owner: "Sofia Lindqvist",
    status: "paused",
    itemsIndexed: 142,
    itemsFailed: 0,
    itemsPending: 0,
    lastSyncAt: daysAgo(14),
    lastRunStatus: "success",
    lastRunDurationSec: 122,
    cursor: "last-edited:2026-09-15T06:00:00Z",
    usedByKbIds: ["kb_all"],
    createdAt: daysAgo(100),
  },
]

// ---- Items ----------------------------------------------------------------

const hrPolicies = [
  "Parental leave policy", "Flexible working policy", "Expense reimbursement policy", "Code of conduct",
  "Anti-harassment policy", "Remote work allowance", "Vacation and statutory holidays", "Sick leave and short-term disability",
  "Performance review cycle", "Compensation bands", "Learning and development budget", "Travel policy",
  "Health and dental benefits guide", "Pension matching", "Onboarding checklist", "Offboarding checklist",
  "Whistleblower policy", "Conflict of interest policy", "Data privacy for employees", "Acceptable use of IT",
  "Dress code", "Overtime and time in lieu", "Bereavement leave", "Jury duty leave", "Relocation assistance",
  "Employee referral bonus", "Probation period guide", "Grievance procedure", "Workplace safety", "Return to office guidance",
]
const hrSuffixes = ["", " — Ontario addendum", " — Quebec addendum", " — BC addendum", " — Alberta addendum", " — FAQ", " — manager guide", " — form", " — summary", " — appendix A", " — appendix B", " — training deck", " — checklist"]
const hrVariants = ["", " (2025)", " (2024)"].flatMap((y) => hrSuffixes.map((sfx) => `${sfx}${y}`))

const engPages = [
  "Incident response runbook", "On-call rotation", "Service ownership model", "API design guidelines", "Database migration checklist",
  "Feature flag conventions", "Observability standards", "Postmortem template", "Release process", "Branching and code review",
  "Secrets management", "Kubernetes cluster layout", "Cost allocation tags", "Data retention rules", "Access request process",
  "Local development setup", "CI pipeline stages", "Dependency upgrade policy", "Security review checklist", "Architecture decision records",
]
const engSpaces = ["ENG", "PLAT", "SRE"]

const ghDocs = [
  "docs/api/authentication.md", "docs/api/rate-limits.md", "docs/api/webhooks.md", "docs/api/errors.md", "docs/api/pagination.md",
  "docs/sdk/typescript.md", "docs/sdk/python.md", "docs/sdk/go.md", "docs/guides/quickstart.md", "docs/guides/idempotency.md",
  "docs/guides/testing-sandbox.md", "docs/reference/accounts.md", "docs/reference/payments.md", "docs/reference/transfers.md",
  "docs/reference/statements.md", "docs/changelog/2026-09.md", "docs/changelog/2026-08.md", "docs/changelog/2026-07.md",
  "README.md", "CONTRIBUTING.md", "docs/reference/disputes.md", "docs/reference/cards.md", "docs/guides/kyc.md", "docs/guides/limits.md",
]

const contracts = [
  "Lumen Partners — Master services agreement (2025).pdf", "Lumen Partners — SOW 3 data migration.pdf", "Cardstock Ltd — Card personalisation agreement.pdf",
  "Cloudridge — Hosting agreement 2024-2027.pdf", "Cloudridge — DPA addendum.pdf", "Signet Verify — KYC vendor contract.pdf",
  "Signet Verify — SLA schedule.pdf", "Meridian Print — Statement printing.pdf", "Halo Security — Penetration testing MSA.pdf",
  "Brightline Recruiting — Placement terms.pdf", "Atlas Payroll — Services agreement.pdf", "Northgate Facilities — Lease amendment 2.pdf",
]

const pricingPages = [
  "/pricing", "/pricing/chequing", "/pricing/savings", "/pricing/business-chequing", "/pricing/credit-cards", "/pricing/credit-cards/rewards",
  "/pricing/credit-cards/low-rate", "/pricing/mortgages", "/pricing/mortgages/fixed", "/pricing/mortgages/variable", "/pricing/lines-of-credit",
  "/pricing/wire-transfers", "/pricing/foreign-exchange", "/fees/overdraft", "/fees/nsf", "/fees/atm", "/fees/paper-statements",
  "/fees/account-closure", "/fees/safe-deposit", "/fees/certified-cheques", "/pricing/student", "/pricing/seniors", "/pricing/newcomers", "/pricing/annual-plans",
]

const lendingFiles = [
  "Lending policy v6 — personal loans.pdf", "Lending policy v6 — small business.pdf", "Fee schedule 2026 Q3.xlsx", "Eligibility bands — personal.xlsx",
  "Hardship program guidelines.pdf", "Collections escalation matrix.xlsx", "Rate card — September 2026.xlsx", "Underwriting exceptions register.docx", "Lending policy v5 — personal loans (superseded).pdf",
]

const owners: Record<string, string[]> = {
  src_hr_sharepoint: ["Elena Moreau", "Grace Chen", "Elena Moreau", "Elena Moreau"],
  src_eng_confluence: ["Marcus Hale", "Dan Whitfield", "Marcus Hale"],
  src_github_docs: ["Marcus Hale", "Dan Whitfield"],
  src_contracts: ["Priya Raman"],
  src_pricing_crawl: ["Sofia Lindqvist"],
  src_lending_policies: ["Tom Okafor"],
  src_branch_faq: ["Sofia Lindqvist"],
  src_notion_product: ["Sofia Lindqvist"],
}

function mk(
  rnd: () => number,
  src: Source,
  i: number,
  title: string,
  path: string,
  mime: string,
  extra: Partial<Item> = {}
): Item {
  const modifiedDays = Math.floor(rnd() * 400)
  const own = owners[src.id]
  const version = `v${1 + Math.floor(rnd() * 6)}.${Math.floor(rnd() * 4)}`
  const stale = modifiedDays > src.staleAfterDays
  return {
    id: `${src.id}_it_${i}`,
    sourceId: src.id,
    externalId: `${src.type}:${i.toString(36)}${Math.floor(rnd() * 9999).toString(36)}`,
    title,
    mimeType: mime,
    path,
    url: src.type === "crawl" ? `https://www.northwind.example${path}` : src.type === "github" ? `https://github.com/northwind-org/platform-docs/blob/main/${path}` : undefined,
    modifiedAt: daysAgo(modifiedDays),
    processedAt: src.lastSyncAt ?? daysAgo(1),
    sizeBytes: Math.floor(20_000 + rnd() * 2_400_000),
    status: "indexed",
    chunkCount: 4 + Math.floor(rnd() * 40),
    tags: [...src.tags],
    metadata: {},
    acl: src.permissions.mode === "workspace" ? ["workspace:*"] : src.permissions.mode === "selected" ? src.permissions.principals : [`group:${src.collection}`, "group:All staff"],
    owner: own[i % own.length],
    version,
    effectiveDate: daysAgo(modifiedDays).slice(0, 10),
    supersedes: rnd() > 0.7 ? `${title.replace(/\s*\(20\d\d\)/, "")} (${2024 + Math.floor(rnd() * 2)})` : undefined,
    reviewBy: stale ? daysAgo(modifiedDays - src.staleAfterDays).slice(0, 10) : inDays(src.staleAfterDays - modifiedDays).slice(0, 10),
    sensitivity: src.sensitivity,
    collection: src.collection,
    verified: rnd() > 0.85,
    queries30d: Math.floor(rnd() * rnd() * 120),
    pageCount: mime === "application/pdf" ? 2 + Math.floor(rnd() * 40) : undefined,
    ...extra,
  }
}

export function buildItems(): Item[] {
  const rnd = seeded(42)
  const out: Item[] = []
  const bySrc = Object.fromEntries(sources.map((s) => [s.id, s])) as Record<string, Source>

  // HR SharePoint: 790 items (3 failed)
  {
    const src = bySrc.src_hr_sharepoint
    let i = 0
    for (const v of hrVariants) {
      for (const p of hrPolicies) {
        if (i >= 790) break
        const title = `${p}${v}`
        const isForm = v === " — form"
        const mime = isForm ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : i % 3 === 0 ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        const it = mk(rnd, src, i, title, `Documents/${isForm ? "Forms" : "Policies"}/${p.replace(/\s+/g, "-")}${v ? "/" + v.trim().replace(/[—()]/g, "").trim().replace(/\s+/g, "-") : ""}.${isForm ? "docx" : mime.includes("pdf") ? "pdf" : "docx"}`, mime)
        it.metadata = { department: "HR", locale: "en", policy_owner: it.owner }
        out.push(it)
        i++
      }
    }
    // three failures
    const fails: [number, ErrorClass, string][] = [
      [17, "parse", "PDF is encrypted; OCR cannot open the file"],
      [143, "parse", "DOCX is password protected"],
      [512, "too_large", "File is 72 MB; limit is 50 MB"],
    ]
    for (const [idx, cls, msg] of fails) {
      out[idx].status = "failed"
      out[idx].errorClass = cls
      out[idx].error = msg
      out[idx].chunkCount = 0
    }
  }

  // Confluence: 380 items
  {
    const src = bySrc.src_eng_confluence
    let i = 0
    const suffixes = ["", " — v2", " — checklist", " — examples", " — FAQ", " — diagrams", " — 2025 review", " — owners", " — SLAs", " — glossary", " — playbook", " — quick reference", " — onboarding", " — history", " — decisions", " — metrics", " — links", " — templates", " — runbook"]
    for (const s of suffixes) {
      for (const p of engPages) {
        if (i >= 380) break
        const space = engSpaces[i % 3]
        const it = mk(rnd, src, i, `${p}${s}`, `${space}/${p.replace(/\s+/g, "+")}${s ? "/" + s.replace(/[— ]+/g, "-") : ""}`, "text/html")
        it.metadata = { space, team: space === "SRE" ? "sre" : "platform" }
        out.push(it)
        i++
      }
    }
  }

  // GitHub: 214 items
  {
    const src = bySrc.src_github_docs
    let i = 0
    const dirs = ["", "v2/", "v1/", "internal/", "partners/", "mobile/", "admin/", "legacy/", "beta/"]
    for (const d of dirs) {
      for (const p of ghDocs) {
        if (i >= 214) break
        const path = d ? p.replace("docs/", `docs/${d}`) : p
        const title = path.split("/").pop()!.replace(/\.md$/, "").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
        const it = mk(rnd, src, i, title, path, "text/markdown")
        it.metadata = { area: path.split("/")[1] ?? "root", repo: "platform-docs" }
        out.push(it)
        i++
      }
    }
  }

  // Contracts: 12 (1 failed)
  {
    const src = bySrc.src_contracts
    contracts.forEach((c, i) => {
      const it = mk(rnd, src, i, c.replace(/\.pdf$/, ""), `Legal/Contracts/${c}`, "application/pdf", {
        fileId: `file_contract_${i}`,
        metadata: { vendor: c.split(" — ")[0], doc_type: "contract" },
      })
      if (i === 6) {
        it.status = "failed"
        it.errorClass = "parse"
        it.error = "PDF is encrypted (owner password); upload an unlocked copy"
        it.chunkCount = 0
      }
      out.push(it)
    })
  }

  // Pricing crawl: 96
  {
    const src = bySrc.src_pricing_crawl
    let i = 0
    const locales = ["", "/fr", "/en-us", "/print"]
    for (const l of locales) {
      for (const p of pricingPages) {
        if (i >= 96) break
        const path = `${p}${l}`
        const title = (p === "/pricing" ? "Pricing overview" : p.split("/").pop()!.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())) + (l ? ` (${l.slice(1)})` : "")
        const it = mk(rnd, src, i, title, path, "text/html")
        it.metadata = { product: p.split("/")[2] ?? "overview", locale: "en-CA" }
        it.modifiedAt = daysAgo(Math.floor(rnd() * 20))
        it.reviewBy = inDays(30 - Math.floor(rnd() * 20)).slice(0, 10)
        out.push(it)
        i++
      }
    }
  }

  // Lending: 9
  {
    const src = bySrc.src_lending_policies
    lendingFiles.forEach((f, i) => {
      const mime = f.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : f.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"
      const it = mk(rnd, src, i, f.replace(/\.(pdf|xlsx|docx)$/, ""), `Lending/${f}`, mime, {
        fileId: `file_lending_${i}`,
        metadata: { policy_area: f.split(" ")[0].toLowerCase(), effective: "2026-07-01" },
        version: f.includes("v6") ? "v6.0" : f.includes("v5") ? "v5.2" : "v1.3",
        effectiveDate: "2026-07-01",
        reviewBy: "2026-12-31",
        verified: true,
      })
      if (f.includes("v6 — personal")) it.supersedes = "Lending policy v5 — personal loans"
      if (f.includes("v5")) {
        it.modifiedAt = daysAgo(240)
        it.effectiveDate = "2025-01-15"
        it.reviewBy = "2026-01-15"
      }
      out.push(it)
    })
  }

  // Branch FAQ: 1
  {
    const src = bySrc.src_branch_faq
    const it = mk(rnd, src, 0, "Branch FAQ", "Branch FAQ.md", "text/markdown", { metadata: { audience: "branch-staff" }, chunkCount: 58 })
    it.modifiedAt = daysAgo(6)
    out.push(it)
  }

  // Notion: 142
  {
    const src = bySrc.src_notion_product
    const pages = ["Product wiki", "Roadmap 2026 H2", "Pricing experiments", "Mobile app release notes", "Card controls spec", "Open banking integration", "Design system", "Research repository", "Competitor notes", "Support macros"]
    let i = 0
    for (let k = 0; k < 15; k++) {
      for (const p of pages) {
        if (i >= 142) break
        const it = mk(rnd, src, i, k === 0 ? p : `${p} — part ${k}`, `Product wiki/${p}${k ? "/part-" + k : ""}`, "text/html")
        it.metadata = { space: "product" }
        out.push(it)
        i++
      }
    }
  }

  return out
}

// ---- Runs -----------------------------------------------------------------

const doneP = (name: SyncRunPhaseName, ms: number) => ({ name, durationMs: ms, status: "done" as const })
type SyncRunPhaseName = "list" | "fetch" | "parse" | "chunk" | "embed" | "upsert"

export const runs: SyncRun[] = [
  {
    id: "run_hr_1",
    sourceId: "src_hr_sharepoint",
    trigger: "schedule",
    startedAt: ago(0.32),
    durationSec: 412,
    status: "partial",
    cursorBefore: "delta:MzslMjM7MTsy",
    cursorAfter: "delta:MzslMjM7MTsz",
    counts: { listed: 812, unchanged: 741, upserted: 46, deleted: 0, failed: 3, skipped: 22 },
    phases: [doneP("list", 2100), doneP("fetch", 88000), doneP("parse", 190000), doneP("chunk", 41000), doneP("embed", 79000), doneP("upsert", 12000)],
    errors: [
      { itemId: "src_hr_sharepoint_it_17", itemTitle: "Onboarding checklist", phase: "parse", errorClass: "parse", message: "PDF is encrypted; OCR cannot open the file" },
      { itemId: "src_hr_sharepoint_it_143", itemTitle: "Health and dental benefits guide — Ontario addendum", phase: "parse", errorClass: "parse", message: "DOCX is password protected" },
      { itemId: "src_hr_sharepoint_it_512", itemTitle: "Learning and development budget — appendix A", phase: "fetch", errorClass: "too_large", message: "File is 72 MB; limit is 50 MB" },
    ],
    log: [
      "02:00:01 list: delta query from cursor delta:MzslMjM7MTsy",
      "02:00:03 list: 812 items, 46 changed, 22 skipped by rule **/Archive/**",
      "02:01:31 fetch: 46 files (61.2 MB)",
      "02:01:40 fetch: FAILED Learning and development budget — appendix A (72 MB > 50 MB)",
      "02:04:51 parse: 44 ok, 2 failed (encrypted)",
      "02:05:32 chunk: 1,893 chunks (structure aware, 512/50)",
      "02:06:51 embed: 1,893 vectors",
      "02:07:03 upsert: 46 documents, 3 failed",
      "02:07:03 done: partial",
    ],
  },
  {
    id: "run_hr_2",
    sourceId: "src_hr_sharepoint",
    trigger: "schedule",
    startedAt: daysAgo(1),
    durationSec: 388,
    status: "partial",
    counts: { listed: 809, unchanged: 780, upserted: 26, deleted: 1, failed: 3, skipped: 22 },
    phases: [doneP("list", 2000), doneP("fetch", 60000), doneP("parse", 180000), doneP("chunk", 39000), doneP("embed", 70000), doneP("upsert", 11000)],
    errors: [],
    log: ["done: partial (3 known failures)"],
  },
  {
    id: "run_hr_3",
    sourceId: "src_hr_sharepoint",
    trigger: "webhook",
    startedAt: daysAgo(2),
    durationSec: 41,
    status: "success",
    counts: { listed: 809, unchanged: 805, upserted: 4, deleted: 0, failed: 0, skipped: 22 },
    phases: [doneP("list", 1800), doneP("fetch", 8000), doneP("parse", 16000), doneP("chunk", 4000), doneP("embed", 9000), doneP("upsert", 2000)],
    errors: [],
    log: ["done: success"],
  },
  {
    id: "run_hr_4",
    sourceId: "src_hr_sharepoint",
    trigger: "full",
    startedAt: daysAgo(9),
    durationSec: 2410,
    status: "success",
    cursorRejected: true,
    counts: { listed: 806, unchanged: 0, upserted: 806, deleted: 4, failed: 0, skipped: 22 },
    phases: [doneP("list", 9000), doneP("fetch", 600000), doneP("parse", 1200000), doneP("chunk", 200000), doneP("embed", 380000), doneP("upsert", 21000)],
    errors: [],
    log: ["list: saved cursor rejected by SharePoint (410 Gone); full listing ran", "4 unseen items removed", "done: success"],
  },
  {
    id: "run_conf_1",
    sourceId: "src_eng_confluence",
    trigger: "schedule",
    startedAt: ago(9),
    durationSec: 4,
    status: "failed",
    cursorBefore: "modified-since:2026-09-22T03:00:00Z",
    counts: { listed: 0, unchanged: 0, upserted: 0, deleted: 0, failed: 0, skipped: 0 },
    phases: [{ name: "list", durationMs: 3900, status: "failed" }, { name: "fetch", durationMs: 0, status: "skipped" }, { name: "parse", durationMs: 0, status: "skipped" }, { name: "chunk", durationMs: 0, status: "skipped" }, { name: "embed", durationMs: 0, status: "skipped" }, { name: "upsert", durationMs: 0, status: "skipped" }],
    errors: [{ itemId: "", itemTitle: "(connection)", phase: "list", errorClass: "permission", message: "401 from Confluence: token expired" }],
    log: ["03:00:00 list: GET /wiki/rest/api/content/search?cql=lastModified>=2026-09-22", "03:00:04 list: HTTP 401 Unauthorized — token expired", "03:00:04 done: failed (connection)"],
  },
  {
    id: "run_conf_2",
    sourceId: "src_eng_confluence",
    trigger: "schedule",
    startedAt: daysAgo(7),
    durationSec: 301,
    status: "success",
    counts: { listed: 384, unchanged: 360, upserted: 20, deleted: 4, failed: 0, skipped: 9 },
    phases: [doneP("list", 4000), doneP("fetch", 60000), doneP("parse", 120000), doneP("chunk", 30000), doneP("embed", 80000), doneP("upsert", 7000)],
    errors: [],
    log: ["done: success"],
  },
  {
    id: "run_gh_1",
    sourceId: "src_github_docs",
    trigger: "webhook",
    startedAt: ago(3),
    durationSec: 38,
    status: "success",
    cursorBefore: "sha:1b77a09",
    cursorAfter: "sha:9f3c1e2",
    counts: { listed: 214, unchanged: 211, upserted: 3, deleted: 0, failed: 0, skipped: 6 },
    phases: [doneP("list", 900), doneP("fetch", 3000), doneP("parse", 6000), doneP("chunk", 4000), doneP("embed", 20000), doneP("upsert", 4000)],
    errors: [],
    log: ["push webhook: 3 files changed in docs/api", "done: success"],
  },
  {
    id: "run_gh_2",
    sourceId: "src_github_docs",
    trigger: "schedule",
    startedAt: daysAgo(1),
    durationSec: 22,
    status: "success",
    counts: { listed: 214, unchanged: 214, upserted: 0, deleted: 0, failed: 0, skipped: 6 },
    phases: [doneP("list", 900), doneP("fetch", 0), doneP("parse", 0), doneP("chunk", 0), doneP("embed", 0), doneP("upsert", 0)],
    errors: [],
    log: ["done: success (no changes)"],
  },
  {
    id: "run_contracts_1",
    sourceId: "src_contracts",
    trigger: "manual",
    startedAt: daysAgo(3),
    durationSec: 96,
    status: "partial",
    counts: { listed: 12, unchanged: 0, upserted: 11, deleted: 0, failed: 1, skipped: 0 },
    phases: [doneP("list", 300), doneP("fetch", 2000), doneP("parse", 70000), doneP("chunk", 9000), doneP("embed", 13000), doneP("upsert", 1700)],
    errors: [{ itemId: "src_contracts_it_6", itemTitle: "Signet Verify — SLA schedule", phase: "parse", errorClass: "parse", message: "PDF is encrypted (owner password); upload an unlocked copy" }],
    log: ["parse: OCR on 4 scanned pages", "parse: FAILED Signet Verify — SLA schedule (encrypted)", "done: partial"],
  },
  {
    id: "run_pricing_1",
    sourceId: "src_pricing_crawl",
    trigger: "schedule",
    startedAt: ago(2),
    durationSec: 61,
    status: "success",
    cursorAfter: "etag-set:96",
    counts: { listed: 96, unchanged: 90, upserted: 6, deleted: 0, failed: 0, skipped: 3 },
    phases: [doneP("list", 1500), doneP("fetch", 30000), doneP("parse", 9000), doneP("chunk", 5000), doneP("embed", 12000), doneP("upsert", 2500)],
    errors: [],
    log: ["sitemap: 99 URLs, 3 excluded by /pricing/archive/**", "6 pages changed (lastmod)", "done: success"],
  },
  {
    id: "run_pricing_2",
    sourceId: "src_pricing_crawl",
    trigger: "schedule",
    startedAt: daysAgo(1),
    durationSec: 240,
    status: "backing_off",
    counts: { listed: 96, unchanged: 60, upserted: 12, deleted: 0, failed: 0, skipped: 3 },
    phases: [doneP("list", 1500), { name: "fetch", durationMs: 200000, status: "failed" }, { name: "parse", durationMs: 0, status: "skipped" }, { name: "chunk", durationMs: 0, status: "skipped" }, { name: "embed", durationMs: 0, status: "skipped" }, { name: "upsert", durationMs: 0, status: "skipped" }],
    errors: [{ itemId: "", itemTitle: "(24 pages)", phase: "fetch", errorClass: "rate_limited", message: "429 from www.northwind.example; Retry-After 900s" }],
    log: ["fetch: 429 after 72 pages; backing off 15 min", "resumed and completed in run at 05:00 next day"],
  },
  {
    id: "run_lending_1",
    sourceId: "src_lending_policies",
    trigger: "manual",
    startedAt: daysAgo(1),
    durationSec: 44,
    status: "success",
    counts: { listed: 9, unchanged: 7, upserted: 2, deleted: 0, failed: 0, skipped: 0 },
    phases: [doneP("list", 200), doneP("fetch", 1000), doneP("parse", 20000), doneP("chunk", 8000), doneP("embed", 12000), doneP("upsert", 2000)],
    errors: [],
    log: ["parse: 3 spreadsheets → 412 row chunks", "done: success"],
  },
  {
    id: "run_notion_1",
    sourceId: "src_notion_product",
    trigger: "schedule",
    startedAt: daysAgo(14),
    durationSec: 122,
    status: "success",
    counts: { listed: 142, unchanged: 130, upserted: 12, deleted: 0, failed: 0, skipped: 0 },
    phases: [doneP("list", 3000), doneP("fetch", 40000), doneP("parse", 20000), doneP("chunk", 30000), doneP("embed", 25000), doneP("upsert", 4000)],
    errors: [],
    log: ["done: success"],
  },
  {
    id: "run_faq_1",
    sourceId: "src_branch_faq",
    trigger: "manual",
    startedAt: daysAgo(6),
    durationSec: 9,
    status: "success",
    counts: { listed: 1, unchanged: 0, upserted: 1, deleted: 0, failed: 0, skipped: 0 },
    phases: [doneP("list", 10), doneP("fetch", 10), doneP("parse", 500), doneP("chunk", 6000), doneP("embed", 2000), doneP("upsert", 300)],
    errors: [],
    log: ["chunk: FAQ optimised → 58 question/answer chunks", "done: success"],
  },
]

export const itemStatusLabel: Record<ItemStatus, string> = {
  indexed: "Indexed",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
  partial: "Partial",
  excluded: "Excluded",
  deleted: "Deleted at source",
}

export const sensitivityLabel: Record<Sensitivity, string> = {
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
}
