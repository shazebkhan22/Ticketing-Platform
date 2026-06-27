import type { Ticket } from "@/types/ticket";

export function isOverdue(ticket: Ticket): boolean {
  if (ticket.status === "Closed") return false;
  if (!ticket.deadlineDate) return false;
  // Compare as plain date strings (matches the backend's DATE < CURRENT_DATE
  // check) rather than parsing deadlineDate as UTC midnight and comparing
  // against the local "now" timestamp, which flags tickets due today/tomorrow
  // as overdue in timezones behind UTC.
  return ticket.deadlineDate.slice(0, 10) < todayLocalDate();
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

// Capitalizes only the first character, leaving the rest of what the user
// typed untouched — e.g. "city mart" -> "City mart", not "City Mart". Used
// on free-text prose fields (names, problem descriptions, addresses) so
// typed data is consistently sentence-cased without fighting mid-word
// casing a user intended (acronyms, etc).
export function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function todayLocalDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}