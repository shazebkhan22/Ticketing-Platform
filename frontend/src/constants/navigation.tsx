import {
  LayoutDashboardIcon,
  ListChecksIcon,
  AlertTriangleIcon,
  PlusCircleIcon,
} from "lucide-react";

export const NAV_MAIN = [
  { title: "Dashboard", url: "/", icon: <LayoutDashboardIcon /> },
  { title: "My Tickets", url: "/?mine=true", icon: <ListChecksIcon /> },
  { title: "Overdue", url: "/?overdue=true", icon: <AlertTriangleIcon /> },
  { title: "Add New Ticket", url: "/tickets/new", icon: <PlusCircleIcon />, cta: true },
];

export const NAV_SECONDARY = [
  
];
