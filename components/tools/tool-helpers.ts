import type { Integration, Secret, Tool } from "@/lib/mock/types"

export const scopeLabel: Record<Tool["consumers"][number]["scope"], string> = {
  read: "Read",
  write: "Write",
  create_no_delete: "Create, no delete",
}

/** The fields the detail page edits. Status, stats, version and example change through their own actions. */
export function editable(t: Tool) {
  return {
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    outputDescription: t.outputDescription,
    tags: t.tags,
    requiresConfirmation: t.requiresConfirmation,
    availableToMembers: t.availableToMembers,
    consumers: t.consumers,
    rest: t.rest,
    code: t.code ? { ...t.code, deployedVersion: undefined } : undefined,
  }
}

export function isDirty(draft: Tool, saved: Tool) {
  return JSON.stringify(editable(draft)) !== JSON.stringify(editable(saved))
}

function allRestText(t: Tool): string {
  if (!t.rest) return ""
  return [t.rest.url, t.rest.body, ...t.rest.headers.map((h) => h.value), ...t.rest.query.map((q) => q.value)].join("\n")
}

export function templateRefs(text: string) {
  const inputs = Array.from(text.matchAll(/\{\{\s*input\.(\w+)\s*\}\}/g)).map((m) => m[1])
  const secrets = Array.from(text.matchAll(/\{\{\s*secret\.(\w+)\s*\}\}/g)).map((m) => m[1])
  return { inputs: Array.from(new Set(inputs)), secrets: Array.from(new Set(secrets)) }
}

/** Secrets a REST tool references, split by what is wrong with them. */
export function secretIssues(t: Tool, secrets: Secret[]) {
  const refs = templateRefs(allRestText(t)).secrets
  if (t.rest?.auth === "secret" && t.rest.authRef) refs.push(t.rest.authRef)
  const names = Array.from(new Set(refs))
  const missing = names.filter((n) => !secrets.some((s) => s.name === n))
  const inactive = names.filter((n) => secrets.some((s) => s.name === n && !s.isActive))
  return { missing, inactive }
}

export function integrationFor(t: Tool, integrations: Integration[]) {
  if (t.rest?.auth === "integration" && t.rest.authRef) return integrations.find((i) => i.id === t.rest?.authRef)
  if (t.integrationType) return integrations.find((i) => i.type === t.integrationType)
  return undefined
}

/** Schema and template checks shared by Validate on the REST and Test panels. */
export function validateTool(t: Tool, secrets: Secret[]): string[] {
  const errors: string[] = []
  const names = t.inputSchema.map((f) => f.name.trim())
  names.forEach((n, i) => {
    if (!n) errors.push(`Input field ${i + 1} has no name`)
    else if (names.indexOf(n) !== i) errors.push(`Input field "${n}" is declared twice`)
  })
  t.inputSchema.forEach((f) => {
    if (f.type === "enum" && !(f.enum && f.enum.length)) errors.push(`Enum field "${f.name}" has no allowed values`)
  })
  if (t.rest) {
    if (!/^https?:\/\//.test(t.rest.url)) errors.push("URL must be absolute and start with http:// or https://")
    const refs = templateRefs(allRestText(t))
    refs.inputs.filter((i) => !names.includes(i)).forEach((i) => errors.push(`Template references {{input.${i}}}, which is not a declared input`))
    const { missing, inactive } = secretIssues(t, secrets)
    missing.forEach((s) => errors.push(`Secret ${s} does not exist`))
    inactive.forEach((s) => errors.push(`Secret ${s} is inactive`))
    if (t.rest.body.trim() && ["POST", "PUT", "PATCH"].includes(t.rest.method)) {
      try {
        JSON.parse(t.rest.body.replace(/\{\{[^}]+\}\}/g, "0"))
      } catch {
        errors.push("Body is not valid JSON once templates are filled")
      }
    }
  }
  if (t.code) {
    if (!t.code.files.some((f) => f.path === t.code?.entry)) errors.push(`Entry file ${t.code.entry} is missing`)
    t.code.secrets.filter((s) => !secrets.some((x) => x.name === s)).forEach((s) => errors.push(`Environment secret ${s} does not exist`))
  }
  return errors
}
