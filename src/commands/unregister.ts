import { ApplicationCommandTypes, InteractionResponseTypes } from "deps";
import { logger } from "utils/logger.ts";
import { createCommand } from "commands/mod.ts";
import { configs } from "configs";
import { memberHasAdminPermissions } from "utils/tools.ts";

const log = logger({ name: "Command: Unregister Cleanup" });
const kv = await Deno.openKv(configs.kv_data); // Open the KV store

createCommand({
  name: "unregister",
  description: "Remove Swabby from a channel so he stops cleaning it.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Guild",
  execute: async (bot, interaction) => {
    const channelId = interaction.channelId;
    const guildId = interaction.guildId;

    if (!channelId || !guildId) {
      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: { content: "Unable to unregister the channel.", flags: 64 },
        },
      );
    }

    if (
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

    // Use the same key structure as in the register command
    const key = ["cleanup_channels", guildId.toString(), channelId.toString()];

    // Check if the channel is already registered
    const exists = await kv.get(key);

    if (!exists.value) {
      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: "This channel is not registered for cleanup.",
            flags: 64,
          },
        },
      );
    }

    // Remove the channel from KV store
    await kv.delete(key);

    // Count the remaining number of registered channels for this guild
    let channelCount = 0;
    for await (
      const _ of kv.list({ prefix: ["cleanup_channels", guildId.toString()] })
    ) {
      channelCount++;
    }

    // Logging the removal of the channel
    log.info(
      `Unregistered channel (${channelId}) from cleanup in guild ${guildId}. Total remaining channels: ${channelCount}.`,
    );

    // Create a clickable link to the channel
    const channelLink = `<#${channelId}>`;

    // Send response with the clickable channel link
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content:
            `This channel ${channelLink} has been unregistered from cleanup.`,
          flags: 64,
        },
      },
    );
  },
});
