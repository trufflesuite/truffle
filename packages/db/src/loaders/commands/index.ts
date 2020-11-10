import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands");

export { generateMigrateLoad } from "./migrate";
