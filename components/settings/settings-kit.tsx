"use client"

import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Section } from "@/components/shared/surface"

/** Local draft of a stored value. Dirty when it differs from what is stored; resets when the store changes. */
export function useDraft<T>(stored: T) {
  const [draft, setDraft] = useState<T>(stored)
  const key = JSON.stringify(stored)
  useEffect(() => setDraft(stored), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== key
  return { draft, setDraft, dirty, reset: () => setDraft(stored), patch: (p: Partial<T>) => setDraft((d) => ({ ...d, ...p })) }
}

/** A settings card: its own Save, enabled only when something changed. */
export function SettingsSection({ title, description, dirty, onSave, onReset, children, savedLabel }: { title: string; description?: ReactNode; dirty?: boolean; onSave?: () => void; onReset?: () => void; children: ReactNode; savedLabel?: string }) {
  return (
    <Section
      title={title}
      description={description}
      actions={
        onSave ? (
          <>
            {dirty && onReset && <Button size="sm" variant="ghost" onClick={onReset}>Discard</Button>}
            <Button size="sm" disabled={!dirty} onClick={() => { onSave(); toast.success(savedLabel ?? `${title} saved`) }}>Save</Button>
          </>
        ) : undefined
      }
      bodyClassName="space-y-4"
    >
      {children}
    </Section>
  )
}

export function Field({ label, htmlFor, hint, children, className }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function SwitchRow({ id, label, description, checked, onCheckedChange, disabled }: { id: string; label: ReactNode; description?: ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
