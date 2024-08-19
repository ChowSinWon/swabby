import { events } from "events/mod.ts";
import { updateGuildCommands } from "utils/helpers.ts";
import { logger } from "utils/logger.ts";

const log = logger({ name: "Event: guildCreate" });

events.guildCreate = async (bot, guild) => {
  log.info(
    `${guild.name} with ${guild.memberCount} members.`,
  );

  return await updateGuildCommands(bot, guild);
};
