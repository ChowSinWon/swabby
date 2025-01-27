import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "deps";
import { logger } from "utils/logger.ts";
import { send, sendInteractiveResponse } from "utils/tools.ts";
import { createCommand } from "commands/mod.ts";
import { MessageCleaner } from "utils/message-cleaner.ts";

const log = logger({ name: "Command: Clean" });

const DEFAULT_COUNT = 10;
const MAX_COUNT = 50;
const DEFAULT_DAYS = 0;

createCommand({
  name: "clean",
  description:
    "Scrub the last X messages from the channel. Default: 10, Maximum: 50",
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: "count",
      description: "Number of messages to delete",
      type: ApplicationCommandOptionTypes.Integer,
      required: false,
      minValue: 1,
      maxValue: MAX_COUNT,
    },
    {
      name: "days",
      description: "Just scrub messages older than X days. Default: 0",
      type: ApplicationCommandOptionTypes.Integer,
      required: false,
      minValue: 0,
    },
  ],
  scope: "Guild",
  execute: async (bot, interaction) => {
    const countOption = interaction.data?.options?.find(
      (option) => option.name === "count",
    );
    const daysOption = interaction.data?.options?.find(
      (option) => option.name === "days",
    );

    const count = Math.min(
      Math.max(Number(countOption?.value || DEFAULT_COUNT), 1),
      MAX_COUNT,
    );
    const days = Math.max(Number(daysOption?.value || DEFAULT_DAYS), 0);

    const channelId = interaction.channelId;

    if (!channelId) {
      await send(
        bot,
        interaction,
        "This command can only be used in a channel.",
        true,
      );
      return;
    }

    try {
      const channel = await bot.helpers.getChannel(channelId);
      const guildId = interaction.guildId;
      const logMessage =
        `Cleaning ${count} messages for @${interaction.user.username}`;
      if (guildId) {
        const guild = await bot.helpers.getGuild(guildId);
        log.info(logMessage, `in #${channel.name} (${guild.name})`);
      } else {
        log.info(logMessage);
      }
    } catch (error: unknown) {
      log.error(
        error instanceof Error ? error.toString() : String(error),
      );

      let message = "I am sorry, I forgot what to do 😬";
      if (
        error instanceof Error &&
        error.toString().includes("Missing Access")
      ) {
        message = "I'm sorry, I don't have access to this channel.";
      }

      await send(bot, interaction, message);
      return;
    }

    const messageCleaner = new MessageCleaner(bot, channelId);

    try {
      const messagesWithAge = await messageCleaner.fetchMessages(count, days);
      if (messagesWithAge.length === 0) {
        await send(
          bot,
          interaction,
          "No messages found matching the criteria.",
          true,
        );
        return;
      }

      messageCleaner.logMessages(messagesWithAge);

      await sendInteractiveResponse(bot, interaction, "Sweeping messages...");

      const { successCount, errorCount } = await messageCleaner.deleteMessages(
        messagesWithAge,
      );

      const myMessages = await bot.helpers.getMessages(channelId, {
        limit: 1,
      });

      const [myMessageId] = myMessages?.keys() || [];

      if (myMessageId) {
        await bot.helpers.deleteMessage(channelId, myMessageId);
      }

      await send(
        bot,
        interaction,
        errorCount > 0
          ? `Deleted ${successCount} out of ${messagesWithAge.length} messages.`
          : `Successfully deleted ${successCount} messages.`,
        true,
        true,
      );
    } catch (error: unknown) {
      log.error(
        error instanceof Error ? error.toString() : String(error),
      );

      await send(
        bot,
        interaction,
        "Failed to delete messages. Please try again later.",
        true,
      );
    }
  },
});
