import { logger } from "@truffle/db/logger";
const debug = logger("db:workspace");

import * as Pouch from "./pouch";
import { definitions } from "@truffle/db/resources";

export { Workspace } from "@truffle/db/resources";

export const attach = Pouch.forDefinitions(definitions);
