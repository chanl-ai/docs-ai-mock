import type { Analytics, SeriesPoint } from "../types"
import { NOW, ago, seeded } from "./time"

function days(n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(NOW.getTime() - i * 86400_000)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function buildAnalytics(): Analytics {
  const rnd = seeded(2026)
  const d90 = days(90)
  const queriesPerDay: SeriesPoint[] = d90.map((date, i) => {
    const weekday = new Date(date).getUTCDay()
    const base = weekday === 0 || weekday === 6 ? 380 : 1150
    const trend = 1 + i / 180
    const queries = Math.round(base * trend * (0.8 + rnd() * 0.4))
    return { date, queries, noAnswer: Math.round(queries * (0.06 + rnd() * 0.05)) }
  })
  const queriesByCaller: SeriesPoint[] = queriesPerDay.map((p) => {
    const q = p.queries as number
    const members = Math.round(q * 0.28)
    const api = Math.round(q * 0.31)
    const mcp = Math.round(q * 0.22)
    return { date: p.date, members, api, mcp, public: q - members - api - mcp }
  })
  const executionsPerDay: SeriesPoint[] = d90.map((date) => {
    const weekday = new Date(date).getUTCDay()
    const total = Math.round((weekday === 0 || weekday === 6 ? 90 : 420) * (0.8 + rnd() * 0.4))
    const failed = Math.round(total * (0.02 + rnd() * 0.04))
    return { date, success: total - failed, failed }
  })
  const queriesPerKb: SeriesPoint[] = queriesPerDay.map((p) => {
    const q = p.queries as number
    return { date: p.date, kb_support: Math.round(q * 0.5), kb_people: Math.round(q * 0.16), kb_all: Math.round(q * 0.2), kb_eng: Math.round(q * 0.08), kb_lending: Math.round(q * 0.05), kb_legal: Math.round(q * 0.01) }
  })
  return {
    queriesPerDay,
    queriesByCaller,
    executionsPerDay,
    queriesPerKb,
    topDocuments: [
      { documentId: "src_pricing_crawl_it_23", title: "Annual plans", citations: 1_204, queries: 1_530 },
      { documentId: "src_pricing_crawl_it_14", title: "Nsf", citations: 912, queries: 1_002 },
      { documentId: "src_hr_sharepoint_it_0", title: "Parental leave policy", citations: 611, queries: 640 },
      { documentId: "src_branch_faq_it_0", title: "Branch FAQ", citations: 588, queries: 1_910 },
      { documentId: "src_lending_policies_it_2", title: "Fee schedule 2026 Q3", citations: 402, queries: 455 },
      { documentId: "src_eng_confluence_it_0", title: "Incident response runbook", citations: 233, queries: 260 },
      { documentId: "src_hr_sharepoint_it_6", title: "Vacation and statutory holidays", citations: 198, queries: 240 },
      { documentId: "src_pricing_crawl_it_15", title: "Atm", citations: 170, queries: 220 },
    ],
    topQueries: [
      { query: "refund window for annual plans", count: 412, noAnswerShare: 0.01 },
      { query: "what is the NSF fee", count: 388, noAnswerShare: 0.0 },
      { query: "parental leave top-up", count: 240, noAnswerShare: 0.02 },
      { query: "how to dispute a transaction", count: 201, noAnswerShare: 0.14 },
      { query: "branch hours halifax", count: 166, noAnswerShare: 0.05 },
      { query: "origination fee small business", count: 120, noAnswerShare: 0.0 },
      { query: "who is on call for payments", count: 98, noAnswerShare: 0.03 },
    ],
    noAnswerQueries: [
      { query: "do you offer a USD account", count: 22, lastSeen: ago(3) },
      { query: "dress code for branch opening", count: 14, lastSeen: ago(20) },
      { query: "pet insurance benefit", count: 9, lastSeen: ago(50) },
      { query: "crypto purchase limits", count: 8, lastSeen: ago(70) },
      { query: "mortgage prepayment penalty calculator", count: 7, lastSeen: ago(12) },
      { query: "wire transfer cut-off time Friday", count: 6, lastSeen: ago(30) },
    ],
    topTools: [
      { toolId: "tool_account_lookup", name: "Account lookup", executions: 1_842, successRate: 0.992, medianMs: 310 },
      { toolId: "tool_fee_lookup", name: "Fee lookup", executions: 640, successRate: 1, medianMs: 140 },
      { toolId: "tool_docs_extract", name: "Extract fields from document", executions: 301, successRate: 0.973, medianMs: 2_140 },
      { toolId: "tool_case_create", name: "Create support case", executions: 212, successRate: 0.948, medianMs: 690 },
      { toolId: "tool_registry_lookup", name: "Business registry lookup", executions: 88, successRate: 0.909, medianMs: 1_020 },
    ],
    clientsByChannel: [
      { channel: "Public link", requests: 4_120 },
      { channel: "API", requests: 3_880 },
      { channel: "App", requests: 2_610 },
      { channel: "MCP", requests: 1_960 },
    ],
    clientsByName: [
      { name: "claude-desktop", requests: 1_140 },
      { name: "cursor", requests: 480 },
      { name: "chatgpt", requests: 260 },
      { name: "custom (fastmcp)", requests: 80 },
    ],
    recentFailures: [
      { executionId: "exec_f1", toolName: "Create support case", message: "Upstream returned 503 Service Unavailable after 2 retries", at: ago(0.5) },
      { executionId: "exec_f2", toolName: "Business registry lookup", message: "Timeout after 15 s", at: ago(3) },
      { executionId: "exec_f3", toolName: "Fee lookup", message: "KeyError: 'amount'", at: ago(7) },
      { executionId: "exec_f4", toolName: "Extract fields from document", message: "File file_x not found", at: ago(11) },
    ],
  }
}
