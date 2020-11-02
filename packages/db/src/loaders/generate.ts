import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:generate");

import { definitions } from "@truffle/db/definitions";
import { forDefinitions } from "./loaders";

export const generate = forDefinitions(definitions);
