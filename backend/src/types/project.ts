export const PROJECT_TIME_UNITS = ["Days", "Weeks", "Months"] as const;

export type ProjectTimeUnit = (typeof PROJECT_TIME_UNITS)[number];
