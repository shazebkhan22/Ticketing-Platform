import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { startFeedbackReminderJob } from "./jobs/feedbackReminder";

app.listen(env.port, () => {
  logger.info(`Cygnus Ticketing backend listening on port ${env.port}`);
});

startFeedbackReminderJob();
