import { logger } from "utils/logger.ts";
import { Bot } from "deps";

const log = logger({ name: "Class: MessageCleaner" });

interface FetchableMessage {
  id: bigint;
  age: number;
  content: string;
}

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
  ): Promise<FetchableMessage[]> {
    const now = Date.now();
    const result: FetchableMessage[] = [];
    let deletableCount = 0;
    let lastMessageId: bigint | undefined;

    while (deletableCount < limit) {
      const messages = await this.bot.helpers.getMessages(this.channelId, {
        limit: 50,
        before: lastMessageId,
      });

      if (!messages || messages.size === 0) {
        break;
      }

      for (const msg of messages.values()) {
        const timestamp = Number(msg.timestamp);
        const age = (now - timestamp) / 1000 / 60 / 60 / 24;
        const canDelete = age >= days;

        if (canDelete) {
          result.push({
            id: msg.id,
            age,
            content: msg.content,
          });

          deletableCount++;
          if (deletableCount >= limit) {
            break;
          }
        }
      }

      lastMessageId = [...messages.keys()].pop();

      if (deletableCount >= limit) {
        break;
      }
    }

    return result;
  }

  logMessages(messages: FetchableMessage[]): void {
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
    messages: FetchableMessage[],
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const msg of messages) {
      try {
        await this.bot.helpers.deleteMessage(this.channelId, msg.id);
        successCount++;
      } catch (deleteError: unknown) {
        errorCount++;
        log.error(
          `Failed to delete message ${msg.id} (Content: "${msg.content}"): `,
          deleteError instanceof Error
            ? deleteError.toString()
            : String(deleteError),
        );
      }
    }

    return { successCount, errorCount };
  }
}
