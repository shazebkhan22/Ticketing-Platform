import type { Ticket } from "@/types/ticket";

export function isOverdue(ticket: Ticket): boolean {
  if (ticket.status === "Closed") return false;
  if (!ticket.deadlineDate) return false;
  return new Date(ticket.deadlineDate).getTime() < Date.now();
}

export function ticketStatusLabel(ticket: Ticket): string {
  return isOverdue(ticket) ? "Overdue" : ticket.status;
}

export function truncateChars(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Intl renders the day period as lowercase "am"/"pm" for en-IN; uppercase it
// for display since that's the conventional casing.
function uppercaseMeridiem(formatted: string): string {
  return formatted.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}

export function formatDateTime(value: string): string {
  return uppercaseMeridiem(new Date(value).toLocaleString("en-IN"));
}

export function formatDateTimeWithSeconds(value: string): string {
  return uppercaseMeridiem(
    new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );
}

export function todayLocalDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}