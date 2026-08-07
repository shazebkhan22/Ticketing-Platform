"use client"

import * as React from "react"
import { NavLink } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NAV_MAIN, NAV_ADMIN, NAV_INVENTORY, NAV_SECONDARY } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const canSeeInventory = isAdmin || user?.team === "Field"
  const navMainItems = [
    ...NAV_MAIN,
    ...(canSeeInventory ? NAV_INVENTORY : []),
    ...(isAdmin ? NAV_ADMIN : []),
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                {/* <div className="flex aspect-square size-10 items-center justify-center rounded-lg  text-sidebar-primary-foreground"> */}
                <div className="flex mx-auto justify-center mt-2">
                  <img src="/Cygnus Exp.png" className="w-full h-8" />
                </div>
                {/* <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">CISPL</span>
                  <span className="truncate text-xs">Ticketing System</span>
                </div> */}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
