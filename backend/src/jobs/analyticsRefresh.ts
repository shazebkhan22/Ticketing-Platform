import cron from "node-cron";
import { pool } from "../db/pool";
import { logger } from "../utils/logger";

const ANALYTICS_MATERIALIZED_VIEWS = [
  "mv_analytics_monthly",
  "mv_analytics_call_type",
  "mv_analytics_employee",
  "mv_analytics_priority",
  "mv_analytics_status",
  "mv_analytics_mode",
  "mv_analytics_internal_tag",
];

// CONCURRENTLY requires the unique index each view already has (see the
// analytics-materialized-views migration) — it lets getAnalytics keep
// reading the view uninterrupted while this refresh runs, instead of
// blocking behind an exclusive lock.
async function refreshAnalyticsViews() {
  for (const view of ANALYTICS_MATERIALIZED_VIEWS) {
    await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
  }
}

export function startAnalyticsRefreshJob() {
  cron.schedule("*/15 * * * *", () => {
    refreshAnalyticsViews().catch((err) => {
      logger.error({ err }, "Analytics materialized view refresh failed");
    });
  });
}

// Exported separately so controllers/tickets.ts's Excel/other write paths
// could trigger an immediate refresh in the future if "must be up to the
// second" ever becomes a requirement — not called anywhere yet, the cron
// schedule above is the only trigger today.
export { refreshAnalyticsViews };
