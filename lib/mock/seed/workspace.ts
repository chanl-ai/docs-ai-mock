import type { Group, Invitation, Member, User, Workspace } from "../types"
import { daysAgo, ago, inDays } from "./time"

export const users: User[] = [
  { id: "u_priya", name: "Priya Raman", email: "priya@northwind.example" },
  { id: "u_marcus", name: "Marcus Hale", email: "marcus@northwind.example" },
  { id: "u_elena", name: "Elena Moreau", email: "elena@northwind.example" },
  { id: "u_tom", name: "Tom Okafor", email: "tom@northwind.example" },
  { id: "u_sofia", name: "Sofia Lindqvist", email: "sofia@northwind.example" },
  { id: "u_dan", name: "Dan Whitfield", email: "dan@northwind.example" },
]

export const currentUser: User = users[0]

export const workspaces: Workspace[] = [
  {
    id: "ws_northwind",
    name: "Northwind Financial",
    slug: "northwind",
    plan: "Business",
    storageQuotaBytes: 10 * 1024 ** 3,
    storageUsedBytes: 4.2 * 1024 ** 3,
    memberCount: 6,
    role: "owner",
    timezone: "America/Toronto",
    createdAt: daysAgo(210),
  },
  {
    id: "ws_sandbox",
    name: "Priya's sandbox",
    slug: "priya-sandbox",
    plan: "Free",
    storageQuotaBytes: 1 * 1024 ** 3,
    storageUsedBytes: 0.12 * 1024 ** 3,
    memberCount: 1,
    role: "owner",
    timezone: "America/Toronto",
    createdAt: daysAgo(40),
  },
]

export const members: Member[] = [
  { userId: "u_priya", name: "Priya Raman", email: "priya@northwind.example", role: "owner", joinedAt: daysAgo(210), lastActiveAt: ago(0.2) },
  { userId: "u_marcus", name: "Marcus Hale", email: "marcus@northwind.example", role: "admin", joinedAt: daysAgo(198), lastActiveAt: ago(3) },
  { userId: "u_elena", name: "Elena Moreau", email: "elena@northwind.example", role: "admin", joinedAt: daysAgo(160), lastActiveAt: ago(26) },
  { userId: "u_tom", name: "Tom Okafor", email: "tom@northwind.example", role: "member", joinedAt: daysAgo(120), lastActiveAt: ago(1) },
  { userId: "u_sofia", name: "Sofia Lindqvist", email: "sofia@northwind.example", role: "member", joinedAt: daysAgo(64), lastActiveAt: ago(50) },
  { userId: "u_dan", name: "Dan Whitfield", email: "dan@northwind.example", role: "member", joinedAt: daysAgo(12), lastActiveAt: ago(8) },
]

export const invitations: Invitation[] = [
  { id: "inv_1", email: "grace.chen@northwind.example", role: "member", invitedBy: "Priya Raman", sentAt: daysAgo(2), expiresAt: inDays(5), status: "pending" },
  { id: "inv_2", email: "contractor@lumenpartners.example", role: "member", invitedBy: "Marcus Hale", sentAt: daysAgo(11), expiresAt: daysAgo(4), status: "expired" },
]

export const groups: Group[] = [
  { id: "g_hr", name: "HR", memberCount: 14, lastSyncedAt: ago(6) },
  { id: "g_eng", name: "Engineering", memberCount: 61, lastSyncedAt: ago(6) },
  { id: "g_lending", name: "Lending", memberCount: 27, lastSyncedAt: ago(6) },
  { id: "g_legal", name: "Legal", memberCount: 6, lastSyncedAt: ago(6) },
  { id: "g_all", name: "All staff", memberCount: 412, lastSyncedAt: ago(6) },
]
