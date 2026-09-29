"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TagInput } from "@/components/shared/tag-input"
import { useMock } from "@/lib/mock/store"
import { useRole } from "@/hooks/use-role"
import type { Role } from "@/lib/mock/types"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX = 50

export function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { owner } = useRole()
  const members = useMock((s) => s.members)
  const invitations = useMock((s) => s.invitations)
  const inviteMembers = useMock((s) => s.inviteMembers)
  const [emails, setEmails] = useState<string[]>([])
  const [role, setRole] = useState<Role>("member")
  const [message, setMessage] = useState("")

  const invalid = emails.filter((e) => !EMAIL.test(e))
  const existing = emails.filter((e) => members.some((m) => m.email.toLowerCase() === e.toLowerCase()))
  const pending = emails.filter((e) => invitations.some((i) => i.email.toLowerCase() === e.toLowerCase() && i.status === "pending"))
  const tooMany = emails.length > MAX
  const ok = emails.length > 0 && !invalid.length && !existing.length && !tooMany

  const reset = () => { setEmails([]); setRole("member"); setMessage("") }
  const submit = () => {
    inviteMembers(emails, role)
    toast.success(`Invited ${emails.length} ${emails.length === 1 ? "person" : "people"}`, { description: pending.length ? `${pending.length} already had a pending invitation; it was sent again.` : "Invitations expire in 7 days." })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>They get an email with a link to join this workspace. Up to {MAX} addresses at once.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-emails">Email addresses</Label>
            <TagInput id="invite-emails" value={emails} onChange={setEmails} placeholder="name@northwind.example, press Enter" />
            {invalid.length > 0 && <p className="text-xs text-destructive">Not a valid email: {invalid.join(", ")}</p>}
            {existing.length > 0 && <p className="text-xs text-destructive">Already a member: {existing.join(", ")}</p>}
            {tooMany && <p className="text-xs text-destructive">{emails.length} addresses; the limit is {MAX} per invite.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member · asks questions, uploads files, uses tools</SelectItem>
                <SelectItem value="admin">Admin · also manages sources, knowledge bases and settings</SelectItem>
                {owner && <SelectItem value="owner">Owner · also manages billing and can delete the workspace</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-message">Message <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="invite-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Added to the email above the join link." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!ok}>Send {emails.length > 1 ? `${emails.length} invitations` : "invitation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
