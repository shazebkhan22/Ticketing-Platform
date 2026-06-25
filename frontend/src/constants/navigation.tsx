import {
  LayoutDashboardIcon,
  ListChecksIcon,
  AlertTriangleIcon,
  PlusCircleIcon,
  HistoryIcon,
} from "lucide-react";

export const NAV_MAIN = [
  { title: "Dashboard", url: "/", icon: <LayoutDashboardIcon /> },
  { title: "My Tickets", url: "/?mine=true", icon: <ListChecksIcon /> },
  { title: "Overdue", url: "/?overdue=true", icon: <AlertTriangleIcon /> },
  { title: "Add New Ticket", url: "/tickets/new", icon: <PlusCircleIcon />, cta: true },
];

// Shown only to admins — see AppSidebar, which filters by user.role.
export const NAV_ADMIN = [
  { title: "Activity Log", url: "/activity", icon: <HistoryIcon /> },
];

export const NAV_SECONDARY = [
  
];
