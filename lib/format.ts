import { formatDistanceToNowStrict, format, differenceInDays } from "date-fns"

export function relative(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (Math.abs(diff) < 45_000) return diff >= 0 ? "just now" : "in a moment"
  const s = formatDistanceToNowStrict(d, { addSuffix: true })
  return s.replace(" seconds", "s").replace(" second", "s").replace(" minutes", " min").replace(" minute", " min").replace(" hours", " h").replace(" hour", " h")
}

export function shortDate(iso?: string): string {
  if (!iso) return "—"
  return format(new Date(iso), "d MMM yyyy")
}

export function dateTime(iso?: string): string {
  if (!iso) return "—"
  return format(new Date(iso), "d MMM yyyy, HH:mm")
}

export function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined
  return differenceInDays(new Date(iso), new Date())
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

export function num(n: number): string {
  return n.toLocaleString("en-CA")
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function ms(n: number): string {
  if (n < 1000) return `${Math.round(n)} ms`
  return `${(n / 1000).toFixed(1)} s`
}

export function duration(sec: number): string {
  if (sec < 60) return `${sec} s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s ? `${m} min ${s} s` : `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export function mimeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF"
  if (mime.includes("wordprocessingml")) return "DOCX"
  if (mime.includes("spreadsheetml")) return "XLSX"
  if (mime.includes("presentationml")) return "PPTX"
  if (mime === "text/csv") return "CSV"
  if (mime === "text/markdown") return "MD"
  if (mime === "text/html") return "HTML"
  if (mime === "text/plain") return "TXT"
  if (mime.startsWith("image/")) return mime.split("/")[1].toUpperCase().replace("JPEG", "JPG")
  return mime.split("/").pop()?.toUpperCase() ?? mime
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
}

export function snakeify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)
}
