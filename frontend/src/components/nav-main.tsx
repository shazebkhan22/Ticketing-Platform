import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  // SidebarGroupLabel,
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
    cta?: boolean
  }[]
}) {
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}`

  return (
    <SidebarGroup>
      {/* <SidebarGroupLabel>Tickets</SidebarGroupLabel> */}
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={currentPath === item.url}
              className={cn(
                item.cta &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
              )}
            >
              <NavLink
                to={item.url}
                className={({ isActive }) =>
                  cn(isActive && currentPath === item.url && !item.cta && "bg-sidebar-accent")
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
