"use client"

import { useState, type ReactNode } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface Dependent {
  kind: string // "knowledge base", "source", "API key", …
  names: string[]
}

/**
 * Destructive confirm. The object name is typed back only when dependents exist; the dialog
 * always lists what else is affected with counts.
 */
export function DeleteDialog({
  open,
  onOpenChange,
  title,
  objectName,
  description,
  dependents = [],
  consequence,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  objectName: string
  description?: ReactNode
  dependents?: Dependent[]
  consequence?: ReactNode
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
}) {
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const hasDeps = dependents.some((d) => d.names.length > 0)
  const canConfirm = !hasDeps || typed.trim() === objectName

  const handle = async () => {
    setBusy(true)
    await onConfirm()
    setBusy(false)
    setTyped("")
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) setTyped(""); onOpenChange(o) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasDeps && <AlertTriangle className="size-4 text-amber-500" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {description && <p>{description}</p>}
              {hasDeps && (
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  {dependents.filter((d) => d.names.length).map((d) => (
                    <div key={d.kind}>
                      <p className="font-medium text-foreground">
                        {d.names.length} {d.kind}{d.names.length === 1 ? "" : "s"}
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                        {d.names.slice(0, 5).map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                        {d.names.length > 5 && <li>and {d.names.length - 5} more</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {consequence && <p className="text-foreground">{consequence}</p>}
              {hasDeps && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-name" className="text-xs">
                    Type <span className="font-mono">{objectName}</span> to confirm
                  </Label>
                  <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={objectName} autoComplete="off" />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!canConfirm || busy} onClick={handle}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Plain confirm for non-destructive or dependency-free actions. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; confirmLabel?: string; destructive?: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div className="text-sm">{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
