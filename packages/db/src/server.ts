import { logger } from "./logger";
const debug = logger("db:server");

import { definitions } from "@truffle/db/resources";
import { forDefinitions } from "@truffle/db/meta";

export const { serve } = forDefinitions(definitions);
