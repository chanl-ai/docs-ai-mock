"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ChevronsUpDown, LogOut, Moon, Sun, Laptop, UserCog, RotateCcw, Palette } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useMock } from "@/lib/mock/store"
import { getAvatarInitials, getAvatarColor } from "@/lib/utils/avatar"
import type { Role } from "@/lib/mock/types"

const roleLabel: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member" }

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const user = useMock((s) => s.user)
  const role = useMock((s) => s.role)
  const setRole = useMock((s) => s.setRole)
  const logout = useMock((s) => s.logout)
  const resetDemo = useMock((s) => s.resetDemo)

  const initials = getAvatarInitials(user.name, user.email)
  const color = getAvatarColor(user.email)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-white" style={{ backgroundColor: color }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{roleLabel[role]}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-white" style={{ backgroundColor: color }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserCog />
                  View as
                  <Badge variant="secondary" className="ml-auto font-normal">
                    {roleLabel[role]}
                  </Badge>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={role} onValueChange={(v) => { setRole(v as Role); toast.message(`Viewing as ${roleLabel[v as Role]}`, { description: v === "member" ? "Admin pages now show the permission-denied state." : "Full access restored." }) }}>
                      <DropdownMenuRadioItem value="owner">Owner</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="member">Member</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
                      <DropdownMenuRadioItem value="light"><Sun className="mr-2 size-4" /> Light</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark"><Moon className="mr-2 size-4" /> Dark</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system"><Laptop className="mr-2 size-4" /> System</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => { resetDemo(); toast.success("Demo data reset") }}>
                <RotateCcw />
                Reset demo data
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); router.push("/login") }}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
