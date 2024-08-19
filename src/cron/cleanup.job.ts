import { checkCleanupSchedule } from "./schedule.ts"; // Import the checkCleanupSchedule function

Deno.cron("check schedule", "*/1 * * * *", () => {
  checkCleanupSchedule();
});
