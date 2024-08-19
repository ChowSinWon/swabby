import {
  ActivityTypes,
  createBot,
  enableCachePlugin,
  enableCacheSweepers,
  fastFileLoader,
  GatewayIntents,
  startBot,
} from "deps";
import { configs } from "configs";
import { logger } from "utils/logger.ts";
import { events } from "events/mod.ts";
import { updateCommands } from "utils/helpers.ts";
import "cron/cleanup.job.ts";

const log = logger({ name: "Main" });

log.info("Starting Bot, this might take a while...");

const paths = ["./src/events", "./src/commands"];
await fastFileLoader(paths).catch((err) => {
  log.fatal(`Unable to Import ${paths}`);
  log.fatal(err);
  Deno.exit(1);
});

if (!configs.token) {
  throw new Error("Failed reading bot configuration");
}

export const bot = enableCachePlugin(
  createBot({
    token: configs.token,
    botId: BigInt(atob(configs.token.split(".")[0])),
    intents: GatewayIntents.GuildMessages |
      GatewayIntents.MessageContent |
      GatewayIntents.GuildMembers,
    events,
  }),
);

enableCacheSweepers(bot);

bot.gateway.manager.createShardOptions.makePresence = (shardId: number) => {
  return {
    shardId: shardId,
    status: "online",
    activities: [
      {
        name: "Straw Hats Deck Cleaner",
        type: ActivityTypes.Game,
        createdAt: Date.now(),
      },
    ],
  };
};

await startBot(bot);

await updateCommands(bot);
