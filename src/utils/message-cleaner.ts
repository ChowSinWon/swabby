import { logger } from "utils/logger.ts";
import { Bot } from "deps";

const log = logger({ name: "Class: MessageCleaner" });

export class MessageCleaner {
  private bot: Bot;
  private channelId: bigint;

  constructor(bot: Bot, channelId: bigint) {
    this.bot = bot;
    this.channelId = channelId;
  }

  async fetchMessages(
    limit: number,
    days: number = 0,
  ): Promise<{ id: bigint; age: number; content: string }[]> {
    const now = Date.now();
    const result = [];
    let deletableCount = 0;
    let lastMessageId: bigint | undefined;

    while (deletableCount < limit) {
      const messages = await this.bot.helpers.getMessages(this.channelId, {
        limit: 50,
        before: lastMessageId, // Fetch messages before the last message ID in the previous batch
      });

      if (!messages || messages.size === 0) {
        break; // No more messages to fetch
      }

      for (const msg of messages.values()) {
        const timestamp = Number(msg.timestamp);
        const age = (now - timestamp) / 1000 / 60 / 60 / 24;
        const canDelete = age >= days; // Check if the message is old enough to delete

        if (canDelete) {
          result.push({
            id: msg.id,
            age,
            content: msg.content,
          });

          deletableCount++;
          if (deletableCount >= limit) {
            break; // Stop if we've reached the limit of deletable messages
          }
        }
      }

      lastMessageId = [...messages.keys()].pop(); // Update lastMessageId to the ID of the last message in the batch

      if (deletableCount >= limit) {
        break; // Exit the loop if we've reached the limit of deletable messages
      }
    }

    return result;
  }

  logMessages(
    messages: { id: bigint; age: number; content: string }[],
  ): void {
    log.info("Messages with age in days and content:");
    messages.forEach((msg, index) => {
      log.info(
        `Message ${index + 1}: Age - ${
          msg.age.toFixed(2)
        } days, Content - "${msg.content}" (${msg.id})`,
      );
    });
  }

  async deleteMessages(
    messages: { id: bigint; age: number; content: string }[],
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const msg of messages) {
      try {
        await this.bot.helpers.deleteMessage(this.channelId, msg.id);
        successCount++;
      } catch (deleteError) {
        errorCount++;
        log.error(
          `Failed to delete message ${msg.id} (Content: "${msg.content}"):`,
          deleteError,
        );
      }
    }

    return { successCount, errorCount };
  }
}
