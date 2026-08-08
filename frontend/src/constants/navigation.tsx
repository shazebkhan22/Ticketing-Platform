import {
  LayoutDashboardIcon,
  ListChecksIcon,
  AlertTriangleIcon,
  PlusCircleIcon,
  HistoryIcon,
  BuildingIcon,
  UsersIcon,
  FolderKanbanIcon,
  ClipboardCheckIcon,
} from "lucide-react";

export const NAV_MAIN = [
  { title: "Add New Ticket", url: "/tickets/new", icon: <PlusCircleIcon />, cta: true },
  { title: "Dashboard", url: "/", icon: <LayoutDashboardIcon /> },
  { title: "My Tickets", url: "/?mine=true", icon: <ListChecksIcon /> },
  { title: "Overdue", url: "/?overdue=true", icon: <AlertTriangleIcon /> },
  { title: "Projects", url: "/projects", icon: <FolderKanbanIcon /> },
];

// Shown only to admins — see AppSidebar, which filters by user.role.
// Settings lives in the footer user dropdown (see nav-user.tsx) instead of
// here, not duplicated in both places.
export const NAV_ADMIN = [
  { title: "Activity Log", url: "/activity", icon: <HistoryIcon /> },
  { title: "Customers", url: "/customers", icon: <BuildingIcon /> },
  { title: "Analytics", url: "/analytics", icon: <LayoutDashboardIcon /> },
  { title: "Routine Check", url: "/routine-checks", icon: <ClipboardCheckIcon /> },
  { title: "Employees", url: "/users", icon: <UsersIcon /> },
];

// Shown to admins and Team Field only — see AppSidebar, which filters by
// user.role/user.team. Team FMS has no access to inventory at all.
export const NAV_INVENTORY = [
  { title: "Inward/Outward", url: "/inventory", icon: <ListChecksIcon /> },
];

export const NAV_SECONDARY = [];
