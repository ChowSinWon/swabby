import {
  Bot,
  BotWithCache,
  CreateApplicationCommand,
  getGuild,
  Guild,
  hasProperty,
  MakeRequired,
  upsertGuildApplicationCommands,
} from "deps";
import { logger } from "utils/logger.ts";
import { commands } from "commands/mod.ts";
import { subCommand, subCommandGroup } from "commands/mod.ts";
import { configs } from "configs";

const log = logger({ name: "Helpers" });

/** This function will update all commands, or the defined scope */
export async function updateCommands(
  bot: BotWithCache,
  scope?: "Guild" | "Global",
) {
  const globalCommands: MakeRequired<CreateApplicationCommand, "name">[] = [];
  const perGuildCommands: MakeRequired<CreateApplicationCommand, "name">[] = [];

  for (const command of commands.values()) {
    if (command.scope) {
      if (command.scope === "Guild") {
        perGuildCommands.push({
          name: command.name,
          description: command.description,
          type: command.type,
          options: command.options ? command.options : undefined,
        });
      } else if (command.scope === "Global") {
        globalCommands.push({
          name: command.name,
          description: command.description,
          type: command.type,
          options: command.options ? command.options : undefined,
        });
      }
    } else {
      perGuildCommands.push({
        name: command.name,
        description: command.description,
        type: command.type,
        options: command.options ? command.options : undefined,
      });
    }
  }

  if (globalCommands.length && (scope === "Global" || scope === undefined)) {
    log.info("Updating Global Commands, changes should apply in short...");
    await bot.helpers.upsertGlobalApplicationCommands(globalCommands).catch(
      log.error,
    );
  }

  if (perGuildCommands.length && (scope === "Guild" || scope === undefined)) {
    // Define your guild IDs here. You can replace these with the actual guild IDs where you want to register the commands.
    const guildIds = configs.serverIds;

    for (const guildId of guildIds) {
      await upsertGuildApplicationCommands(
        bot,
        BigInt(guildId),
        perGuildCommands,
      ).catch(
        log.error,
      );
    }
  }
}

/** Update commands for a guild */
export async function updateGuildCommands(bot: Bot, guild: Guild) {
  const perGuildCommands: MakeRequired<CreateApplicationCommand, "name">[] = [];

  for (const command of commands.values()) {
    if (command.scope && command.scope === "Guild") {
      perGuildCommands.push({
        name: command.name,
        description: command.description,
        type: command.type,
        options: command.options ? command.options : undefined,
      });
    }
  }

  if (perGuildCommands.length) {
    await upsertGuildApplicationCommands(bot, guild.id, perGuildCommands).catch(
      log.error,
    );
  }
}

export async function getGuildFromId(
  bot: BotWithCache,
  guildId: bigint,
): Promise<Guild> {
  let returnValue: Guild = {} as Guild;

  if (guildId !== 0n) {
    if (bot.guilds.get(guildId)) {
      returnValue = bot.guilds.get(guildId) as Guild;
    }

    await getGuild(bot, guildId).then((guild) => {
      if (guild) bot.guilds.set(guildId, guild);
      if (guild) returnValue = guild;
    });
  }

  return returnValue;
}

export function snowflakeToTimestamp(id: bigint) {
  return Number(id / 4194304n + 1420070400000n);
}

export function humanizeMilliseconds(milliseconds: number) {
  // Gets ms into seconds
  const time = milliseconds / 1000;
  if (time < 1) return "1s";

  const days = Math.floor(time / 86400);
  const hours = Math.floor((time % 86400) / 3600);
  const minutes = Math.floor(((time % 86400) % 3600) / 60);
  const seconds = Math.floor(((time % 86400) % 3600) % 60);

  const dayString = days ? `${days}d ` : "";
  const hourString = hours ? `${hours}h ` : "";
  const minuteString = minutes ? `${minutes}m ` : "";
  const secondString = seconds ? `${seconds}s ` : "";

  return `${dayString}${hourString}${minuteString}${secondString}`;
}

export function isSubCommand(
  data: subCommand | subCommandGroup,
): data is subCommand {
  return !hasProperty(data, "subCommands");
}

export function isSubCommandGroup(
  data: subCommand | subCommandGroup,
): data is subCommandGroup {
  return hasProperty(data, "subCommands");
}
