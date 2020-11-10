import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands");

export { generateCompileLoad } from "./compile";
export { generateNamesLoad } from "./names";
export { generateMigrateLoad } from "./migrate";
