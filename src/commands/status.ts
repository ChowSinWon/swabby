import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionResponseTypes,
} from "deps";
import { logger } from "utils/logger.ts";
import { createCommand } from "commands/mod.ts";
import { kv } from "configs";
import { timeZones } from "utils/timezones.ts";
import { convertUTCToTimeZone } from "utils/tools.ts";

const log = logger({ name: "Command: Status" });

createCommand({
  name: "status",
  description:
    "Show the status of all registered channels and the scheduled cleanup time.",
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: "timezone",
      description: "Your time zone (e.g., 'UTC', 'America/New_York').",
      type: ApplicationCommandOptionTypes.String,
      required: false,
      choices: timeZones.map((tz) => ({
        name: tz.name,
        value: tz.value,
      })),
    },
  ],
  execute: async (bot, interaction) => {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Acknowledge the command to avoid timeout
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
      },
    );

    // Attempt to retrieve the user's stored time zone
    const storedTimeZoneEntry = await kv.get<string>(["user_timezone", userId]);
    const storedTimeZone = storedTimeZoneEntry.value;

    // Allow the user to override the stored time zone if they specify one
    const userTimeZone = interaction.data?.options?.find((option) =>
      option.name === "timezone"
    )?.value as string || storedTimeZone || "UTC";

    if (!guildId) {
      return await bot.helpers.editOriginalInteractionResponse(
        interaction.token,
        {
          content: "Unable to retrieve status information.",
        },
      );
    }

    const channels: string[] = [];

    // Retrieve the registered channel IDs from KV
    for await (
      const entry of kv.list({
        prefix: ["cleanup_channels", guildId.toString()],
      })
    ) {
      const channelId = entry.value as string;
      const channel = await bot.helpers.getChannel(channelId);

      if (channel) {
        channels.push(`<#${channelId}>`);
      }
    }

    // Retrieve the cleanup time and time zone from KV store
    const cleanupTimeEntry = await kv.get<{ time: string; timeZone: string }>([
      "cleanup_time",
      guildId.toString(),
    ]);
    const utcTime = cleanupTimeEntry.value
      ? cleanupTimeEntry.value.time
      : "not set";

    // Convert the UTC time to the user's time zone
    const userTime = utcTime !== "not set"
      ? convertUTCToTimeZone(utcTime, userTimeZone)
      : "not set";

    if (channels.length === 0) {
      return await bot.helpers.editOriginalInteractionResponse(
        interaction.token,
        {
          content: "No channels registered for cleanup in this guild.",
        },
      );
    }

    // Create a message with all registered channels and cleanup time
    const channelList = channels.join("\n");
    const messageContent =
      `**Registered channels for cleanup:**\n${channelList}\n\n**Scheduled cleanup time:**\n- **UTC:** ${utcTime} (UTC)\n- **Your Time Zone (${userTimeZone}):** ${userTime}`;

    // Edit the original response with the final status
    const guild = await bot.helpers.getGuild(guildId);
    const guildName = guild.name;
    await bot.helpers.editOriginalInteractionResponse(
      interaction.token,
      {
        content: messageContent,
      },
    );

    log.info(`Displayed status for "${guildName}" (${guildId}).`);
  },
});
