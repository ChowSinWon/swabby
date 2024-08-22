import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "deps";
import { logger } from "utils/logger.ts";
import { send, sendInteractiveResponse } from "utils/tools.ts";
import { createCommand } from "commands/mod.ts";

const log = logger({ name: "Command: Clean" });

createCommand({
  name: "clean",
  description: "Scrub the last X messages from the channel.",
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: "count",
      description: "Number of messages to delete. Default: 10, Maximum: 50",
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

    let sweepingMessage;
    try {
      await sendInteractiveResponse(
        bot,
        interaction,
        "sweeping...",
      );

      const lastMessages = await bot.helpers.getMessages(channelId, {
        limit: 10,
      });
      for (const [_key, msg] of lastMessages) {
        if (msg.content === "sweeping...") {
          sweepingMessage = msg;
          break;
        }
      }

      const now = Date.now();
      const ageLimit = days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      let fetchedCount = 0;
      let totalDeleted = 0;
      let lastMessageId = sweepingMessage?.id;

      while (fetchedCount < count) {
        const messages = await bot.helpers.getMessages(channelId, {
          limit: Math.min(count - fetchedCount, 100), // Fetch in batches
          before: lastMessageId,
        });

        if (!messages || messages.size === 0) {
          break; // No more messages to fetch
        }

        const filteredMessages = messages.filter((msg) => {
          const messageAge = now - new Date(msg.timestamp).getTime();
          return messageAge >= ageLimit;
        });

        // If we have messages older than the threshold, delete them
        for (const [key, msg] of filteredMessages) {
          if (fetchedCount >= count) {
            break;
          }
          try {
            await bot.helpers.deleteMessage(channelId, key);
            fetchedCount++;
            totalDeleted++;
          } catch (deleteError) {
            console.error(
              `Failed to delete message ${key} (\`${msg}\`):`,
              deleteError,
            );
          }
        }

        // Update lastMessageId for the next fetch
        lastMessageId = messages.last()?.id;

        if (filteredMessages.size === 0 && fetchedCount === 0) {
          // If no messages matched the age criteria, break the loop
          break;
        }
      }

      if (sweepingMessage) {
        // remove "sweeping..." message
        await bot.helpers.deleteMessage(channelId, sweepingMessage.id);
      }

      if (totalDeleted === 0) {
        await send(
          bot,
          interaction,
          "No messages matched the criteria for deletion.",
          true,
          true,
        );

        return;
      } else {
        await send(
          bot,
          interaction,
          `Deck has been scrubbed - have fun!\n${totalDeleted} message${
            totalDeleted > 1 ? "s" : ""
          } removed.`,
          true,
          true,
        );
      }
    } catch (error) {
      log.error(error.toString());

      await send(
        bot,
        interaction,
        "Failed to wipe messages. Please try again later.",
        true,
      );
    }
  },
});
