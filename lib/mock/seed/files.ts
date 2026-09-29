import type { FileRecord, Folder } from "../types"
import { daysAgo, seeded } from "./time"

export const folders: Folder[] = [
  { id: "f_policies", name: "Policies", parentId: null },
  { id: "f_hr", name: "HR", parentId: "f_policies" },
  { id: "f_lending", name: "Lending", parentId: null },
  { id: "f_legal", name: "Legal", parentId: null },
  { id: "f_contracts", name: "Contracts", parentId: "f_legal" },
  { id: "f_onboarding", name: "Onboarding", parentId: null },
  { id: "f_product", name: "Product", parentId: null },
  { id: "f_brand", name: "Brand assets", parentId: "f_product" },
]

const MB = 1024 * 1024
const PDF = "application/pdf"
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

// A small inline SVG so image previews render without external assets.
const brandSvg = (label: string, fill: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="${fill}"/><circle cx="120" cy="200" r="70" fill="white" opacity="0.9"/><rect x="230" y="150" width="330" height="28" rx="6" fill="white" opacity="0.9"/><rect x="230" y="200" width="240" height="20" rx="5" fill="white" opacity="0.6"/><text x="230" y="270" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="white">${label}</text></svg>`
  )}`

function f(
  id: string,
  name: string,
  folderId: string | null,
  sizeBytes: number,
  mimeType: string,
  uploadedBy: string,
  daysOld: number,
  extra: Partial<FileRecord> = {}
): FileRecord {
  const version = extra.version ?? 1
  const versions = Array.from({ length: version }, (_, i) => ({
    n: i + 1,
    sizeBytes: Math.round(sizeBytes * (0.8 + i * 0.1)),
    uploadedBy: i === version - 1 ? uploadedBy : "Elena Moreau",
    at: daysAgo(daysOld + (version - 1 - i) * 30),
  }))
  return {
    id,
    name,
    folderId,
    sizeBytes,
    mimeType,
    version,
    tags: [],
    uploadedBy,
    createdAt: daysAgo(daysOld + (version - 1) * 30),
    modifiedAt: daysAgo(daysOld),
    checksum: `sha256:${(seeded(id.length * 31 + daysOld)() * 1e16).toString(16).padStart(16, "0")}…`,
    versions,
    usedBySourceIds: [],
    ...extra,
  }
}

const contractNames = [
  "Lumen Partners — Master services agreement (2025).pdf", "Lumen Partners — SOW 3 data migration.pdf", "Cardstock Ltd — Card personalisation agreement.pdf",
  "Cloudridge — Hosting agreement 2024-2027.pdf", "Cloudridge — DPA addendum.pdf", "Signet Verify — KYC vendor contract.pdf",
  "Signet Verify — SLA schedule.pdf", "Meridian Print — Statement printing.pdf", "Halo Security — Penetration testing MSA.pdf",
  "Brightline Recruiting — Placement terms.pdf", "Atlas Payroll — Services agreement.pdf", "Northgate Facilities — Lease amendment 2.pdf",
]

const lendingNames = [
  ["Lending policy v6 — personal loans.pdf", PDF, 3.1 * MB, 3],
  ["Lending policy v6 — small business.pdf", PDF, 2.7 * MB, 2],
  ["Fee schedule 2026 Q3.xlsx", XLSX, 0.4 * MB, 4],
  ["Eligibility bands — personal.xlsx", XLSX, 0.2 * MB, 2],
  ["Hardship program guidelines.pdf", PDF, 1.1 * MB, 1],
  ["Collections escalation matrix.xlsx", XLSX, 0.1 * MB, 1],
  ["Rate card — September 2026.xlsx", XLSX, 0.1 * MB, 1],
  ["Underwriting exceptions register.docx", DOCX, 0.3 * MB, 5],
  ["Lending policy v5 — personal loans (superseded).pdf", PDF, 2.9 * MB, 2],
] as const

export const files: FileRecord[] = [
  ...contractNames.map((n, i) =>
    f(`file_contract_${i}`, n, "f_contracts", Math.round((0.6 + (i % 5) * 0.7) * MB), PDF, "Priya Raman", 3 + i * 2, {
      tags: ["contract", n.split(" — ")[0].toLowerCase().replace(/\s+/g, "-")],
      usedBySourceIds: ["src_contracts"],
      pageCount: 8 + i * 3,
      version: i === 3 ? 2 : 1,
      textPreview: `${n.replace(".pdf", "")}\n\nTHIS AGREEMENT is made on the effective date between Northwind Financial ("Client") and ${n.split(" — ")[0]} ("Vendor").\n\n1. Services. The Vendor shall provide the services described in Schedule A.\n2. Term. This agreement runs for 36 months from the effective date and renews for successive 12 month terms unless either party gives 90 days' notice.\n3. Fees. Fees are set out in Schedule B and invoiced monthly in arrears.\n4. Service levels. The Vendor shall meet the service levels in Schedule C; credits apply per section 4.3.`,
    })
  ),
  ...lendingNames.map(([n, mime, size, v], i) =>
    f(`file_lending_${i}`, n, "f_lending", Math.round(size), mime, "Tom Okafor", 1 + i, {
      tags: ["policy", "lending", ...(n.includes("Fee") || n.includes("Rate") ? ["fees"] : [])],
      usedBySourceIds: ["src_lending_policies"],
      version: v,
      pageCount: mime === PDF ? 24 + i * 4 : undefined,
      textPreview: mime === XLSX
        ? "Product,Band,Origination,Min,Max\nSmall business term loan,<= $250k,1.00%,$500,$2500\nSmall business term loan,> $250k,0.75%,$1500,$7500\nSmall business term loan (secured),> $250k,0.50%,$1000,$5000\nPersonal loan,any,$150 flat,,\nLine of credit,any,$0,,"
        : `${n}\n\n1. Purpose\nThis policy sets the terms on which Northwind Financial extends credit.\n\n2. Scope\nApplies to all personal lending originated in branch, online or through partners.\n\n3. Eligibility\n3.1 Applicants must be 18 or older and resident in Canada.\n3.2 Total debt service ratio must not exceed 42%.`,
    })
  ),
  f("file_onb_1", "Welcome pack 2026.pdf", "f_onboarding", Math.round(4.2 * MB), PDF, "Elena Moreau", 12, { tags: ["onboarding"], pageCount: 32, textPreview: "Welcome to Northwind Financial\n\nYour first week: badge, laptop, benefits enrolment, and the People policies knowledge base." }),
  f("file_onb_2", "Benefits enrolment form.docx", "f_onboarding", Math.round(0.2 * MB), DOCX, "Elena Moreau", 12, { tags: ["onboarding", "form"] }),
  f("file_onb_3", "IT setup guide.pdf", "f_onboarding", Math.round(1.8 * MB), PDF, "Dan Whitfield", 30, { tags: ["onboarding", "it"], pageCount: 12 }),
  f("file_onb_4", "Org chart Q3 2026.pptx", "f_onboarding", Math.round(6.5 * MB), PPTX, "Elena Moreau", 20, { tags: ["onboarding"] }),
  f("file_hr_1", "Employee handbook 2026.pdf", "f_hr", Math.round(5.6 * MB), PDF, "Elena Moreau", 45, { tags: ["policy", "hr"], pageCount: 88, version: 3 }),
  f("file_hr_2", "Expense claim template.xlsx", "f_hr", Math.round(0.1 * MB), XLSX, "Elena Moreau", 90, { tags: ["form"], textPreview: "Date,Category,Amount,Receipt\n2026-09-01,Travel,142.50,yes" }),
  f("file_prod_1", "Card controls spec v2.docx", "f_product", Math.round(0.9 * MB), DOCX, "Sofia Lindqvist", 8, { tags: ["spec", "product"] }),
  f("file_prod_2", "Pricing model 2027.xlsx", "f_product", Math.round(1.4 * MB), XLSX, "Sofia Lindqvist", 4, { tags: ["pricing"], textPreview: "Plan,Monthly,Annual\nEveryday,4.95,49.50\nPlus,9.95,99.50\nPremier,19.95,199.50" }),
  f("file_brand_1", "Logo primary.png", "f_brand", Math.round(0.3 * MB), "image/png", "Sofia Lindqvist", 60, { tags: ["brand"], imageDataUrl: brandSvg("Northwind Financial", "#1d4ed8") }),
  f("file_brand_2", "Card art rewards.png", "f_brand", Math.round(1.1 * MB), "image/png", "Sofia Lindqvist", 33, { tags: ["brand", "cards"], imageDataUrl: brandSvg("Rewards card", "#7c3aed") }),
  f("file_brand_3", "Branch signage.jpg", "f_brand", Math.round(2.4 * MB), "image/jpeg", "Sofia Lindqvist", 33, { tags: ["brand"], imageDataUrl: brandSvg("Branch signage", "#059669") }),
  f("file_root_1", "Board pack September 2026.pdf", null, Math.round(12.8 * MB), PDF, "Priya Raman", 2, { tags: ["board", "confidential"], pageCount: 64 }),
  f("file_root_2", "Vendor risk register.xlsx", null, Math.round(0.5 * MB), XLSX, "Priya Raman", 15, { tags: ["risk"], textPreview: "Vendor,Tier,Last review\nCloudridge,1,2026-06-01\nSignet Verify,1,2026-05-12" }),
  f("file_root_3", "Old benefits guide 2023.pdf", null, Math.round(3.9 * MB), PDF, "Elena Moreau", 400, { tags: ["hr"], pageCount: 40 }),
]
