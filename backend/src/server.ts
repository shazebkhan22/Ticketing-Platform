import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { startFeedbackReminderJob } from "./jobs/feedbackReminder";
import { startAnalyticsRefreshJob } from "./jobs/analyticsRefresh";

app.listen(env.port, () => {
  logger.info(`Cygnus Ticketing backend listening on port ${env.port}`);
});

startFeedbackReminderJob();
startAnalyticsRefreshJob();
