import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands");

export { generateCompileLoad } from "./compile";
export { generateMigrateLoad } from "./migrate";
