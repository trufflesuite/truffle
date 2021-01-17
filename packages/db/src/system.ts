import { logger } from "@truffle/db/logger";
const debug = logger("db:system");

import { forDefinitions } from "@truffle/db/meta";
import { definitions } from "@truffle/db/resources";

const system = forDefinitions(definitions);

export const { schema, connect, serve, attach, resources, forDb } = system;
