-- Up Migration

-- getAnalytics previously ran ~7 separate full-table aggregate queries on
-- every single Analytics page load, all-time, with no time bound on most of
-- them — fine at today's row count, but a real cost that only grows as
-- tickets accumulates, on every page view. These materialized views compute
-- the same breakdowns once, on a schedule (see jobs/analyticsRefresh.ts,
-- every 15 min — same cadence as the existing feedback reminder job), and
-- getAnalytics now just reads the precomputed rows. Each has a unique index
-- so REFRESH MATERIALIZED VIEW CONCURRENTLY can run without locking reads
-- against the view during a refresh.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_monthly AS
SELECT
  m.month AS month_start,
  TO_CHAR(m.month, 'Mon YYYY') AS month,
  COALESCE(created.count, 0) AS created,
  COALESCE(closed.count, 0) AS closed
FROM generate_series(
  date_trunc('month', CURRENT_DATE) - interval '5 months',
  date_trunc('month', CURRENT_DATE),
  interval '1 month'
) AS m(month)
LEFT JOIN (
  SELECT date_trunc('month', ticket_date) AS month, COUNT(*) AS count
  FROM tickets
  WHERE deleted_at IS NULL AND ticket_date >= date_trunc('month', CURRENT_DATE) - interval '5 months'
  GROUP BY 1
) created ON created.month = m.month
LEFT JOIN (
  SELECT date_trunc('month', closed_at) AS month, COUNT(*) AS count
  FROM tickets
  WHERE deleted_at IS NULL AND closed_at IS NOT NULL AND closed_at >= date_trunc('month', CURRENT_DATE) - interval '5 months'
  GROUP BY 1
) closed ON closed.month = m.month
ORDER BY m.month;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_monthly ON mv_analytics_monthly(month_start);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_call_type AS
SELECT call_type, COUNT(*) AS count
FROM tickets
WHERE deleted_at IS NULL
GROUP BY call_type;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_call_type ON mv_analytics_call_type(call_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_employee AS
SELECT
  u.id AS employee_id,
  u.display_name AS employee,
  COUNT(*) FILTER (WHERE t.status = 'Pending') AS pending,
  COUNT(*) FILTER (WHERE t.status = 'In Progress') AS in_progress,
  COUNT(*) FILTER (WHERE t.status = 'Closed') AS closed
FROM users u
JOIN ticket_assignees ta ON ta.user_id = u.id
JOIN tickets t ON t.sr_no = ta.ticket_sr_no AND t.deleted_at IS NULL
GROUP BY u.id, u.display_name;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_employee ON mv_analytics_employee(employee_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_priority AS
SELECT priority, COUNT(*) AS count FROM tickets WHERE deleted_at IS NULL GROUP BY priority;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_priority ON mv_analytics_priority(priority);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_status AS
SELECT status, COUNT(*) AS count FROM tickets WHERE deleted_at IS NULL GROUP BY status;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_status ON mv_analytics_status(status);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_mode AS
SELECT mode, COUNT(*) AS count FROM tickets WHERE deleted_at IS NULL GROUP BY mode;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_mode ON mv_analytics_mode(mode);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_analytics_internal_tag AS
SELECT internal_tag, COUNT(*) AS count FROM tickets WHERE deleted_at IS NULL GROUP BY internal_tag;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_internal_tag ON mv_analytics_internal_tag(internal_tag);

-- Down Migration

DROP MATERIALIZED VIEW IF EXISTS mv_analytics_internal_tag;
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_mode;
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_status;
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_priority;
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_employee;
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_call_type;
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_monthly;
