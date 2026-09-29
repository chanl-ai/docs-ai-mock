import { FileUp, Link2, Globe, Type, Cloud, BookOpen, HardDrive, Github, StickyNote, LifeBuoy, Building2, type LucideIcon } from "lucide-react"
import type { SourceType, IntegrationType } from "./types"

export interface SourceTypeMeta {
  type: SourceType
  label: string
  short: string
  description: string
  group: "Content you provide" | "Connected apps"
  icon: LucideIcon
  integrationType?: IntegrationType
  supportsInherit: boolean
  supportsWebhook: boolean
  changeDetection: string
  scopeLabel: string
}

export const sourceTypes: SourceTypeMeta[] = [
  { type: "file", label: "File upload", short: "Files", description: "PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, HTML from the library or a new upload. 50 MB each.", group: "Content you provide", icon: FileUp, supportsInherit: false, supportsWebhook: false, changeDetection: "Replace or new version in Files", scopeLabel: "Files" },
  { type: "url", label: "Single URL", short: "URL", description: "One or more page URLs, one per line. Optional header auth for intranets.", group: "Content you provide", icon: Link2, supportsInherit: false, supportsWebhook: false, changeDetection: "ETag, then content hash", scopeLabel: "URLs" },
  { type: "crawl", label: "Website crawl or sitemap", short: "Crawl", description: "Start URL or sitemap, depth, page limit, path patterns, robots respected.", group: "Content you provide", icon: Globe, supportsInherit: false, supportsWebhook: false, changeDetection: "Sitemap lastmod, ETag, content hash", scopeLabel: "Start URL" },
  { type: "text", label: "Plain text or table", short: "Text", description: "Paste Markdown, or a CSV/XLSX where each row becomes a chunk and headers become fields.", group: "Content you provide", icon: Type, supportsInherit: false, supportsWebhook: false, changeDetection: "Edit in place creates a revision", scopeLabel: "Content" },
  { type: "sharepoint", label: "SharePoint / OneDrive", short: "SharePoint", description: "Sites, then libraries or folders. Office and PDF. App-only or delegated auth.", group: "Connected apps", icon: Cloud, integrationType: "sharepoint", supportsInherit: true, supportsWebhook: true, changeDetection: "Drive delta queries; webhook subscriptions", scopeLabel: "Site and libraries" },
  { type: "confluence", label: "Confluence", short: "Confluence", description: "Site, spaces, optional parent page, attachments.", group: "Connected apps", icon: BookOpen, integrationType: "confluence", supportsInherit: true, supportsWebhook: false, changeDetection: "Last-modified since cursor", scopeLabel: "Spaces" },
  { type: "gdrive", label: "Google Drive", short: "Drive", description: "Shared drives and folders. Docs, Sheets and Slides exported.", group: "Connected apps", icon: HardDrive, integrationType: "gdrive", supportsInherit: true, supportsWebhook: true, changeDetection: "Changes feed with page token", scopeLabel: "Drives and folders" },
  { type: "github", label: "GitHub", short: "GitHub", description: "Installation, repos, branch and path globs (default docs/**, **/*.md).", group: "Connected apps", icon: Github, integrationType: "github", supportsInherit: true, supportsWebhook: true, changeDetection: "Head commit compare; push webhooks", scopeLabel: "Repos and paths" },
  { type: "notion", label: "Notion", short: "Notion", description: "Pages and databases, with child pages.", group: "Connected apps", icon: StickyNote, integrationType: "notion", supportsInherit: false, supportsWebhook: false, changeDetection: "Last-edited since cursor", scopeLabel: "Pages" },
  { type: "zendesk", label: "Zendesk", short: "Zendesk", description: "Help centre categories and sections, locales, published only.", group: "Connected apps", icon: LifeBuoy, integrationType: "zendesk", supportsInherit: false, supportsWebhook: false, changeDetection: "Incremental articles API", scopeLabel: "Categories" },
  { type: "salesforce", label: "Salesforce Knowledge", short: "Salesforce", description: "Org, article types, data categories, language, published channel.", group: "Connected apps", icon: Building2, integrationType: "salesforce", supportsInherit: false, supportsWebhook: false, changeDetection: "LastModifiedDate since cursor", scopeLabel: "Article types" },
]

export const sourceTypeMeta = (type: SourceType) => sourceTypes.find((t) => t.type === type)!

export function SourceTypeIcon({ type, className }: { type: SourceType; className?: string }) {
  const Icon = sourceTypeMeta(type).icon
  return <Icon className={className ?? "size-4 shrink-0 text-muted-foreground"} />
}

export function scheduleLabel(s: import("./types").Schedule): string {
  switch (s.kind) {
    case "manual":
      return "Manual"
    case "daily":
      return `Daily ${s.time}`
    case "weekly":
      return `Weekly ${s.day} ${s.time}`
    case "monthly":
      return `Monthly ${s.day}${s.day === 1 ? "st" : s.day === 2 ? "nd" : s.day === 3 ? "rd" : "th"} ${s.time}`
    case "webhook":
      return s.safetyNetDaily ? "Webhook + daily" : "Webhook"
  }
}
