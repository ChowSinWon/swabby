import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "deps";
import { logger } from "utils/logger.ts";
import { send, sendInteractiveResponse } from "utils/tools.ts";
import { createCommand } from "commands/mod.ts";
import { MessageCleaner } from "utils/message-cleaner.ts";

const log = logger({ name: "Command: Clean" });

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
    },
    {
      name: "days",
      description: "Just scrub dirt that is older than X days. Default: 0",
      type: ApplicationCommandOptionTypes.Integer,
      required: false,
    },
  ],
  scope: "Guild",
  execute: async (bot, interaction) => {
    const countOption = interaction.data?.options?.find((option) =>
      option.name === "count"
    );
    const daysOption = interaction.data?.options?.find((option) =>
      option.name === "days"
    );

    let count = Number(countOption?.value || 10);
    let days = Number(daysOption?.value || 0);

    if (count < 1) {
      count = 1;
    }

    if (count > 50) {
      count = 50;
    }

    if (days < 0) {
      days = 0;
    }

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
    } catch (error) {
      log.error(error.toString());

      let message = "I am sorry, I forgot what to do :grimacing:";
      if (error.toString().includes("Missing Access")) {
        message = "I'm sorry, this deck is off limits for me.";
      }

      await send(bot, interaction, message);

      return;
    }

    const messageCleaner = new MessageCleaner(bot, channelId);

    try {
      const messages = await bot.helpers.getMessages(channelId, {
        limit: count,
      });

      if (!messages || messages.size === 0) {
        await send(
          bot,
          interaction,
          "No messages found in this channel.",
          true,
        );

        return;
      }

      const messagesWithAge = await messageCleaner.fetchMessages(count, days);
      messageCleaner.logMessages(messagesWithAge);

      await sendInteractiveResponse(
        bot,
        interaction,
        "sweeping...",
      );

      const { successCount, errorCount } = await messageCleaner.deleteMessages(
        messagesWithAge,
      );

      const myMessages = await bot.helpers.getMessages(channelId, {
        limit: 1,
      });

      const [myMessageId, _value] = myMessages?.entries()?.next()?.value;

      if (myMessageId) {
        await bot.helpers.deleteMessage(channelId, myMessageId);
      }

      await send(
        bot,
        interaction,
        errorCount > 0
          ? `Deleted only ${successCount} of ${messages.size} messages.`
          : `Deck has been scrubbed - have fun!\n${successCount} message${
            successCount > 1 ? "s" : ""
          } removed.`,
        true,
        true,
      );
    } catch (error) {
      log.error(error);

      await send(
        bot,
        interaction,
        "Failed to wipe messages. Please try again later.",
        true,
      );
    }
  },
});
