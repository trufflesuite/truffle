import { logger } from "@truffle/db/logger";
const debug = logger("db:workspace");

import * as Pouch from "./pouch";
import { Workspace, definitions } from "./resources";

export { Workspace };

export const attach = Pouch.forDefinitions(definitions);
