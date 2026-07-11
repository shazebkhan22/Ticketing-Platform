import type { ChartConfig } from "@/components/ui/chart";
import type { AnalyticsStatusCount } from "@/types/ticket";

export const VOLUME_CONFIG = {
  created: {
    label: "Created",
    color: "var(--chart-2)",
  },
  closed: {
    label: "Closed",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export const CALL_TYPE_CONFIG = {
  count: {
    label: "Tickets",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export const EMPLOYEE_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "var(--chart-1)",
  },
  inProgress: {
    label: "In Progress",
    color: "var(--chart-2)",
  },
  closed: {
    label: "Closed",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export const PRIORITY_CONFIG = {
  P1: { label: "P1", color: "var(--chart-1)" },
  P2: { label: "P2", color: "var(--chart-2)" },
  P3: { label: "P3", color: "var(--chart-3)" },
  P4: { label: "P4", color: "var(--chart-4)" },
} satisfies ChartConfig;

// Reuses the same keys/colors as EMPLOYEE_STATUS_CONFIG so "Pending" means
// the same color everywhere on the Analytics page.
export const STATUS_CONFIG = EMPLOYEE_STATUS_CONFIG;

export const MODE_CONFIG = {
  Whatsapp: { label: "Whatsapp", color: "var(--chart-1)" },
  Call: { label: "Call", color: "var(--chart-2)" },
  Mail: { label: "Mail", color: "var(--chart-3)" },
  Verbally: { label: "Verbally", color: "var(--chart-4)" },
} satisfies ChartConfig;

export const INTERNAL_TAG_CONFIG = {
  Internal: { label: "Internal", color: "var(--chart-1)" },
  External: { label: "External", color: "var(--chart-2)" },
} satisfies ChartConfig;

// `In Progress` isn't a valid object key/CSS-var suffix as-is, so the status
// breakdown is keyed on STATUS_CONFIG's camelCase keys instead — this maps
// the raw enum value from the API to that key.
export const STATUS_TO_CONFIG_KEY: Record<AnalyticsStatusCount["status"], keyof typeof STATUS_CONFIG> = {
  Pending: "pending",
  "In Progress": "inProgress",
  Closed: "closed",
};

export function toPieData<T extends { count: number }>(
  rows: T[] | undefined,
  keyOf: (row: T) => string
) {
  return (rows ?? []).map((row) => {
    const key = keyOf(row);
    return { ...row, key, fill: `var(--color-${key})` };
  });
}
