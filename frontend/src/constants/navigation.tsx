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
  { title: "New Ticket", url: "/tickets/new", icon: <PlusCircleIcon /> },
];

export const NAV_SECONDARY = [
  
];
