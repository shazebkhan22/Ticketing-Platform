import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
}) {
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}`

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tickets</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title} isActive={currentPath === item.url}>
              <NavLink
                to={item.url}
                className={({ isActive }) =>
                  cn(isActive && currentPath === item.url && "bg-sidebar-accent")
                }
              >
                {item.icon}
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
