import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import { logger } from "utils/logger.ts";

const log = logger({ name: "Helpers" });
const serverIds = Deno.env.get("SERVER_IDS");

if (!serverIds) {
  log.error(
    "Need SERVER_IDS in .env file. This bot is for dedicated servers only.",
  );
  throw new Error("SERVER_IDS not set");
}

export const configs = {
  kv_data: Deno.env.get("KV_DATA")
    ? Deno.env.get("KV_DATA") + "/deno-kv"
    : undefined,
  token: Deno.env.get("DISCORD_TOKEN"),
  serverIds: serverIds.split(","),
};

export const kv = await Deno.openKv(configs.kv_data); // Open the KV store
