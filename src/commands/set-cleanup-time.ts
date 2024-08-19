import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionResponseTypes,
} from "deps";
import { logger } from "utils/logger.ts";
import { createCommand } from "commands/mod.ts";
import { kv } from "configs";
import { timeZones } from "utils/timezones.ts"; // Import the time zones
import { convertTimeToUTC, memberHasAdminPermissions } from "utils/tools.ts";

const log = logger({ name: "Command: Set Cleanup Time" });

createCommand({
  name: "set-cleanup-time",
  description:
    "Set the time of day for automatic message cleanup (24-hour format HH:MM) with an optional time zone.",
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: "time",
      description: "The time to start cleanup (24-hour format, e.g., 14:00).",
      type: ApplicationCommandOptionTypes.String,
      required: true,
    },
    {
      name: "timezone",
      description: "The time zone for the cleanup time.",
      type: ApplicationCommandOptionTypes.String,
      required: false,
      choices: timeZones.map((tz) => ({
        name: tz.name,
        value: tz.value,
      })),
    },
  ],
  scope: "Guild",
  execute: async (bot, interaction) => {
    const timeOption = interaction.data?.options?.find((option) =>
      option.name === "time"
    )?.value as string;

    const timeZoneOption = interaction.data?.options?.find((option) =>
      option.name === "timezone"
    )?.value as string;

    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (
      guildId &&
      await memberHasAdminPermissions(bot, guildId, interaction.member) ===
        false
    ) {
      log.warn("Member does not have admin permissions.");

      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content:
              "I see what you're asking, but I only take orders from the captain or the bosun.",
            flags: 64,
          },
        },
      );
    }

    if (!timeOption || !guildId) {
      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: "Invalid time format or missing guild ID.",
            flags: 64,
          },
        },
      );
    }

    // Validate the time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(timeOption)) {
      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: "Invalid time format. Please use HH:MM (24-hour format).",
            flags: 64,
          },
        },
      );
    }

    // Retrieve the user's preferred time zone if available
    const storedTimeZoneEntry = await kv.get<string>(["user_timezone", userId]);
    const storedTimeZone = storedTimeZoneEntry.value;

    // If no time zone is provided, default to user's preferred time zone or UTC
    const finalTimeZone = timeZoneOption || storedTimeZone || "UTC";

    // Convert the provided time to UTC using the final time zone
    const utcTime = convertTimeToUTC(timeOption, finalTimeZone);

    // Store the cleanup time in UTC and the original time zone in KV
    await kv.set(["cleanup_time", guildId.toString()], {
      time: utcTime,
      timeZone: "UTC", // Store the time zone as UTC
    });

    // Logging the cleanup time set
    const guild = await bot.helpers.getGuild(guildId);
    const guildName = guild.name;
    log.info(
      `Set cleanup time to ${utcTime} (stored as UTC) for "${guildName}" (${guildId}).`,
    );

    const storedAsUtc = `, stored as ${utcTime} UTC`;

    // Send a confirmation response
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: `Cleanup time set to ${timeOption} (${finalTimeZone}${
            finalTimeZone === "UTC" ? "" : storedAsUtc
          }) for this ship.`,
          flags: 64,
        },
      },
    );
  },
});
