import {
  LayoutDashboardIcon,
  ListChecksIcon,
  AlertTriangleIcon,
  PlusCircleIcon,
  HistoryIcon,
  BuildingIcon,
  SettingsIcon,
} from "lucide-react";

export const NAV_MAIN = [
  { title: "Add New Ticket", url: "/tickets/new", icon: <PlusCircleIcon />, cta: true },
  { title: "Dashboard", url: "/", icon: <LayoutDashboardIcon /> },
  { title: "My Tickets", url: "/?mine=true", icon: <ListChecksIcon /> },
  { title: "Overdue", url: "/?overdue=true", icon: <AlertTriangleIcon /> },
];

// Shown only to admins — see AppSidebar, which filters by user.role.
export const NAV_ADMIN = [
  { title: "Activity Log", url: "/activity", icon: <HistoryIcon /> },
  { title: "Customers", url: "/customers", icon: <BuildingIcon /> },
  {title: "Inventory", url: "/inventory", icon: <ListChecksIcon />},
  { title: "Analytics", url: "/analytics", icon: <LayoutDashboardIcon /> },
  { title: "Settings", url: "/settings", icon: <SettingsIcon /> },
];

export const NAV_SECONDARY = [
];
