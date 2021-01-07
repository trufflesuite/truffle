import { logger } from "@truffle/db/logger";
const debug = logger("db:workspace");

import { forDefinitions } from "./meta";
import { definitions } from "./resources";

export const { attach } = forDefinitions(definitions);
