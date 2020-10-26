import { logger } from "@truffle/db/logger";
const debug = logger("db:connect");

import { definitions } from "./definitions";
import { forDefinitions } from "./pouch";

export const connect = forDefinitions(definitions);
