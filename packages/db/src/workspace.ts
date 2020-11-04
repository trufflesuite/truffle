import { logger } from "@truffle/db/logger";
const debug = logger("db:workspace");

import { forDefinitions } from "@truffle/db/pouch";
import { definitions } from "@truffle/db/resources";

export { Workspace } from "@truffle/db/resources";

export const attach = forDefinitions(definitions);
