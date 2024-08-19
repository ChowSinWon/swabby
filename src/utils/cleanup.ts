import { log } from "utils/logger.ts";
import { bot } from "mod";

const limit = 50;

export async function cleanupChannel(channelId: string) {
  try {
    // Fetch the channel details to get the channel name
    const channel = await bot.helpers.getChannel(channelId);
    const channelName = channel?.name || "Unknown Channel";

    // Fetch up to 50 messages from the channel
    const messages = await bot.helpers.getMessages(channelId, { limit });

    // If there are no messages, the channel is empty
    if (messages.size === 0) {
      log.info(
        `Channel "${channelName}" (${channelId}) is empty. Cleanup completed.`,
      );
      return;
    }

    // Iterate through the Collection and delete each message
    for (const message of messages.values()) {
      await bot.helpers.deleteMessage(channelId, message.id);
    }

    log.info(
      `Cleaned up ${messages.size} messages in channel "${channelName}" (${channelId}).`,
    );

    // If the channel isn't empty, call cleanupChannel again to continue cleaning
    if (messages.size === limit) {
      log.info(
        `Channel "${channelName}" (${channelId}) still has messages. Continuing cleanup...`,
      );
      await cleanupChannel(channelId); // Recursive call
    }
  } catch (error) {
    log.error(`Failed to clean up messages in channel ${channelId}: ${error}`);
  }
}
