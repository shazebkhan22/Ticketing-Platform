import { ProjectTimeUnit } from "../types/project";

// Computed server-side only — the client sends startDate + timeValue/timeUnit,
// never a deadline directly, so the two can't drift apart.
export function computeDeadline(startDate: string, timeValue: number, timeUnit: ProjectTimeUnit): string {
  const date = new Date(`${startDate}T00:00:00Z`);

  switch (timeUnit) {
    case "Days":
      date.setUTCDate(date.getUTCDate() + timeValue);
      break;
    case "Weeks":
      date.setUTCDate(date.getUTCDate() + timeValue * 7);
      break;
    case "Months":
      date.setUTCMonth(date.getUTCMonth() + timeValue);
      break;
  }

  return date.toISOString().slice(0, 10);
}
