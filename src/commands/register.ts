import { ApplicationCommandTypes, InteractionResponseTypes } from "deps";
import { logger } from "utils/logger.ts";
import { createCommand } from "commands/mod.ts";
import { configs } from "configs";
import { memberHasAdminPermissions } from "utils/tools.ts";

const log = logger({ name: "Command: Register Cleanup" });
const kv = await Deno.openKv(configs.kv_data); // Open the KV store

createCommand({
  name: "register",
  description: "Assign Swabby to a channel so he can keep it shipshape.",
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
          data: { content: "Unable to register the channel.", flags: 64 },
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

    // Fetch the channel details to verify the channel exists
    let channel = undefined;
    try {
      channel = await bot.helpers.getChannel(channelId);
    } catch (error) {
      log.error(error);
    }

    if (!channel) {
      return await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: "Apologies, I can't seem to find that deck!",
            flags: 64,
          },
        },
      );
    }

    // Use a unique key for each channel
    const key = ["cleanup_channels", guildId.toString(), channelId.toString()];
    await kv.set(key, channelId.toString());

    // Count the number of registered channels for this guild
    let channelCount = 0;
    for await (
      const _ of kv.list({ prefix: ["cleanup_channels", guildId.toString()] })
    ) {
      channelCount++;
    }

    // Logging the count of registered channels
    log.info(
      `Registered channel ${channel.name} (${channelId}) for cleanup in guild ${guildId}. Total registered channels: ${channelCount}.`,
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
          content: `This channel ${channelLink} is now registered for cleanup.`,
          flags: 64,
        },
      },
    );
  },
});
