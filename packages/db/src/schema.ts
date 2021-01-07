import { logger } from "@truffle/db/logger";
const debug = logger("db:schema");

import { forDefinitions } from "@truffle/db/meta";
import { definitions } from "./resources";

export const { schema } = forDefinitions(definitions);
