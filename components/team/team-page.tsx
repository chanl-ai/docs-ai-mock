"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Clock, Crown, Loader2, LogOut, MoreHorizontal, RefreshCw, Send, UserMinus, UserPlus, Users, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, SortHeader } from "@/components/shared/data-table"
import { EmptyState, PageStateGate, TableSkeleton } from "@/components/shared/states"
import { ConfirmDialog, DeleteDialog } from "@/components/shared/dialogs"
import { StatusBadge } from "@/components/shared/status-badge"
import { usePageState } from "@/hooks/use-page-state"
import { useRole } from "@/hooks/use-role"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { num, relative, shortDate } from "@/lib/format"
import type { Member, Role } from "@/lib/mock/types"
import { InviteDialog } from "./invite-dialog"

const SEAT_LIMIT = 25
const roleLabel: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member" }
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()

export function TeamPage() {
  const state = usePageState()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { base } = useWs()
  const { admin, owner } = useRole()
  const user = useMock((s) => s.user)
  const allMembers = useMock((s) => s.members)
  const invitations = useMock((s) => s.invitations)
  const groups = useMock((s) => s.groups)
  const changeRole = useMock((s) => s.changeRole)
  const removeMember = useMock((s) => s.removeMember)
  const setRole = useMock((s) => s.setRole)
  const cancelInvitation = useMock((s) => s.cancelInvitation)
  const resendInvitation = useMock((s) => s.resendInvitation)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [reassignTo, setReassignTo] = useState<string>("")
  const [transferring, setTransferring] = useState<Member | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const tab = params.get("tab") ?? "members"
  const setTab = (t: string) => {
    const p = new URLSearchParams(params.toString())
    p.set("tab", t)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  const members = state === "empty" ? allMembers.filter((m) => m.userId === user.id) : allMembers
  const owners = allMembers.filter((m) => m.role === "owner")
  const lastOwner = owners.length === 1 && owners[0].userId === user.id
  const seatsFull = allMembers.length >= SEAT_LIMIT

  const columns = useMemo<ColumnDef<Member>[]>(() => {
    const cols: ColumnDef<Member>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-7"><AvatarFallback className="text-[11px]">{initials(row.original.name)}</AvatarFallback></Avatar>
            <span className="truncate font-medium">{row.original.name}</span>
            {row.original.userId === user.id && <Badge variant="outline" className="font-normal">You</Badge>}
          </div>
        ),
        filterFn: (row, _id, v: string) => `${row.original.name} ${row.original.email}`.toLowerCase().includes(v.toLowerCase()),
      },
      { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="font-mono text-xs">{row.original.email}</span> },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const m = row.original
          // Only an owner may grant or take away the owner role.
          const locked = !admin || (m.role === "owner" && !owner) || (m.role === "owner" && m.userId === user.id && owners.length === 1)
          if (locked) return <Badge variant="secondary" className="gap-1 font-normal">{m.role === "owner" && <Crown className="size-3" />}{roleLabel[m.role]}</Badge>
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Select value={m.role} onValueChange={(v) => { changeRole(m.userId, v as Role); toast.success(`${m.name} is now ${roleLabel[v as Role].toLowerCase()}`) }}>
                <SelectTrigger size="sm" className="h-8 w-[120px]" aria-label={`Role for ${m.name}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {owner && <SelectItem value="owner">Owner</SelectItem>}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )
        },
        filterFn: (row, id, v: string[]) => v.includes(row.getValue(id)),
      },
      { accessorKey: "joinedAt", header: ({ column }) => <SortHeader column={column} title="Joined" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{shortDate(row.original.joinedAt)}</span> },
      { accessorKey: "lastActiveAt", header: ({ column }) => <SortHeader column={column} title="Last active" />, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{relative(row.original.lastActiveAt)}</span> },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const m = row.original
          const self = m.userId === user.id
          if (!self && !admin) return null
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${m.name}`}><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {self ? (
                    lastOwner ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div><DropdownMenuItem disabled><LogOut className="size-4" /> Leave workspace</DropdownMenuItem></div>
                        </TooltipTrigger>
                        <TooltipContent side="left">You are the only owner. Transfer ownership before leaving.</TooltipContent>
                      </Tooltip>
                    ) : (
                      <DropdownMenuItem variant="destructive" onClick={() => setLeaving(true)}><LogOut className="size-4" /> Leave workspace</DropdownMenuItem>
                    )
                  ) : (
                    <>
                      {owner && m.role !== "owner" && <DropdownMenuItem onClick={() => setTransferring(m)}><Crown className="size-4" /> Transfer ownership</DropdownMenuItem>}
                      {owner && m.role !== "owner" && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" disabled={m.role === "owner" && !owner} onClick={() => { setReassignTo(user.id); setRemoving(m) }}><UserMinus className="size-4" /> Remove from workspace</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
    return cols
  }, [admin, owner, user.id, owners.length, lastOwner, changeRole])

  const inviteButton = admin && (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button size="sm" onClick={() => setInviteOpen(true)} disabled={seatsFull}>
            <UserPlus className="size-4" /> Invite people
          </Button>
        </span>
      </TooltipTrigger>
      {seatsFull && <TooltipContent>All {SEAT_LIMIT} seats on the Business plan are in use. Remove a member or upgrade to invite more.</TooltipContent>}
    </Tooltip>
  )

  const pendingInvites = state === "empty" ? [] : invitations

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Team"
        description={admin ? "Who is in the workspace, what role they have, and who is still to join." : "Who is in the workspace. Ask an admin to change roles or invite people."}
        scope={`${allMembers.length} of ${SEAT_LIMIT} seats used`}
        actions={inviteButton}
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="members">Members <span className="ml-1 tabular-nums text-muted-foreground">{members.length}</span></TabsTrigger>
          <TabsTrigger value="invitations">Invitations <span className="ml-1 tabular-nums text-muted-foreground">{pendingInvites.length}</span></TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <PageStateGate state={state} loading={<TableSkeleton rows={6} />}>
            <DataTable
              columns={columns}
              data={members}
              getRowId={(r) => r.userId}
              searchColumn="name"
              searchPlaceholder="Search name or email…"
              filters={[{ column: "role", title: "Role", options: [{ label: "Owner", value: "owner" }, { label: "Admin", value: "admin" }, { label: "Member", value: "member" }] }]}
              hideViewOptions
            />
            {members.length <= 1 && admin && (
              <div className="mt-3 rounded-lg border">
                <EmptyState icon={Users} title="You are the only member" description="Members ask the workspace's knowledge and use its tools. Invite colleagues to give them access." action={{ label: "Invite people", onClick: () => setInviteOpen(true) }} />
              </div>
            )}
          </PageStateGate>
        </TabsContent>

        <TabsContent value="invitations">
          <PageStateGate state={state} loading={<TableSkeleton rows={3} />}>
            {pendingInvites.length === 0 ? (
              <div className="rounded-lg border">
                <EmptyState icon={Send} title="No pending invitations" description="An invitation is an email with a link to join this workspace. It expires after 7 days." action={admin ? { label: "Invite people", onClick: () => setInviteOpen(true) } : undefined} />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited by</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      {admin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvites.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.email}</TableCell>
                        <TableCell>{roleLabel[i.role]}</TableCell>
                        <TableCell>{i.invitedBy}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{relative(i.sentAt)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{shortDate(i.expiresAt)}</TableCell>
                        <TableCell>{i.status === "expired" ? <StatusBadge tone="warn" icon={Clock} label="Expired" /> : <StatusBadge tone="neutral" icon={Send} label="Pending" />}</TableCell>
                        {admin && (
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button size="sm" variant="outline" className="h-7" onClick={() => { resendInvitation(i.id); toast.success("Invitation sent again", { description: i.email }) }}><RefreshCw className="size-3.5" /> Resend</Button>
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => { cancelInvitation(i.id); toast.success("Invitation cancelled", { description: i.email }) }}><X className="size-3.5" /> Cancel</Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageStateGate>
        </TabsContent>

        <TabsContent value="groups" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Directory groups synced from the identity provider. Knowledge base and source permissions can name them.</p>
            {admin && (
              <Button size="sm" variant="outline" disabled={syncing} onClick={() => { setSyncing(true); setTimeout(() => { setSyncing(false); toast.success("Groups synced", { description: `${groups.length} groups, no changes` }) }, 1200) }}>
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sync now
              </Button>
            )}
          </div>
          <PageStateGate state={state} loading={<TableSkeleton rows={4} cols={3} />}>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead>Last synced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(state === "empty" ? [] : groups).map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(g.memberCount)}</TableCell>
                      <TableCell className="text-muted-foreground">{relative(g.lastSyncedAt)}</TableCell>
                    </TableRow>
                  ))}
                  {state === "empty" && (
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No groups synced. Groups appear once an identity provider is connected.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </PageStateGate>
        </TabsContent>
      </Tabs>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They lose access immediately. Their MCP tokens are revoked. Files they uploaded and sources they own move to the person you pick.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label>Reassign their files and sources to</Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pick a member" /></SelectTrigger>
              <SelectContent>
                {allMembers.filter((m) => m.userId !== removing?.userId).map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.name}{m.userId === user.id ? " (you)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!reassignTo}
              onClick={() => {
                if (!removing) return
                const to = allMembers.find((m) => m.userId === reassignTo)
                removeMember(removing.userId)
                toast.success(`${removing.name} removed`, { description: `Files and sources moved to ${to?.name}` })
                setRemoving(null)
              }}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {transferring && (
        <DeleteDialog
          open={!!transferring}
          onOpenChange={(o) => !o && setTransferring(null)}
          title={`Transfer ownership to ${transferring.name}?`}
          objectName={transferring.name}
          description="They become the owner, with billing and the right to delete the workspace. You become an admin."
          dependents={[{ kind: "current owner", names: [user.name] }]}
          consequence="Only the new owner can give the role back."
          confirmLabel="Transfer"
          onConfirm={() => {
            changeRole(transferring.userId, "owner")
            changeRole(user.id, "admin")
            setRole("admin")
            toast.success(`${transferring.name} is now the owner`)
          }}
        />
      )}

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title="Leave this workspace?"
        description="You lose access to its knowledge, tools and conversations. An admin has to invite you again to come back."
        confirmLabel="Leave"
        destructive
        onConfirm={() => {
          removeMember(user.id)
          toast.success("You left the workspace")
          router.push("/workspaces")
        }}
      />
    </div>
  )
}
