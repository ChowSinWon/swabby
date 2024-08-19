import { events } from "events/mod.ts";
import { logger } from "utils/logger.ts";

const log = logger({ name: "Event: Ready" });

events.ready = () => {
  log.info("Bot Ready");
};
