import { kv } from "configs"; // Assuming you already have KV set up in your configs
import { log } from "utils/logger.ts";
import { cleanupChannel } from "utils/cleanup.ts"; // Utility function to handle the cleanup
import { DateTime } from "deps";
import { bot } from "mod";

// Function to check if it's time to clean up
export async function checkCleanupSchedule() {
  // Get the current time in UTC in HH:MM format using Luxon
  const currentTimeUTC = DateTime.now().toUTC().toFormat("HH:mm");

  for await (const entry of kv.list({ prefix: ["cleanup_time"] })) {
    const { time: cleanupTimeUTC } = entry.value as {
      time: string;
      timeZone: string;
    };

    // Convert the key to a string to extract guildId
    const guildId = String(entry.key[1]); // Explicitly convert to a string
    if (currentTimeUTC === cleanupTimeUTC) {
      const guild = await bot.helpers.getGuild(BigInt(guildId));
      const guildName = guild.name;

      log.info(
        `Triggering cleanup for "${guildName}" (${guildId}) at ${currentTimeUTC} UTC`,
      );
      await triggerCleanup(guildId);
    }
  }
}

// Function to trigger the cleanup for a guild
export async function triggerCleanup(guildId: string) {
  const channels: string[] = [];

  // Retrieve the registered channel IDs from KV
  for await (
    const entry of kv.list({ prefix: ["cleanup_channels", guildId] })
  ) {
    const channelId = entry.value as string;
    channels.push(channelId);
  }

  // Perform the cleanup on each channel
  for (const channelId of channels) {
    await cleanupChannel(channelId);
  }

  const guild = await bot.helpers.getGuild(BigInt(guildId));
  const guildName = guild.name;
  log.info(`Cleanup completed for "${guildName}" (${guildId}).`);
}
