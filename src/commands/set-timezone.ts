import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionResponseTypes,
} from "deps";
import { logger } from "utils/logger.ts";
import { createCommand } from "commands/mod.ts";
import { timeZones } from "utils/timezones.ts"; // Import the time zones
import { kv } from "configs";

const log = logger({ name: "Command: Set Time Zone" });

createCommand({
  name: "set-timezone",
  description: "Set your preferred time zone.",
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: "timezone",
      description: "Your time zone (e.g., 'UTC', 'America/New_York').",
      type: ApplicationCommandOptionTypes.String,
      required: true,
      choices: timeZones.map((tz) => ({
        name: tz.name,
        value: tz.value,
      })),
    },
  ],
  execute: async (bot, interaction) => {
    const userId = interaction.user.id;
    const timeZone = interaction.data?.options?.find((option) =>
      option.name === "timezone"
    )?.value as string;

    if (!timeZone) {
      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: { content: "Please select a valid time zone.", flags: 64 },
        },
      );
    }

    // Store the user's preferred time zone
    await kv.set(["user_timezone", userId], timeZone);

    // Send a confirmation response
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: `Your preferred time zone has been set to ${timeZone}.`,
          flags: 64,
        },
      },
    );

    log.info(`User ${userId} set their time zone to ${timeZone}.`);
  },
});
