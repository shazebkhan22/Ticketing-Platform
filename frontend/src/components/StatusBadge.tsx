import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ticketStatusLabel } from "@/lib/ticket-utils";
import { STATUS_CLASSES } from "@/constants/ticket";
import type { Ticket } from "@/types/ticket";

export function StatusBadge({ ticket }: { ticket: Ticket }) {
  const label = ticketStatusLabel(ticket);
  return (
    <Badge variant="secondary" className={cn("rounded-full", STATUS_CLASSES[label])}>
      {label}
    </Badge>
  );
}
