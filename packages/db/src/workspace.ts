import { logger } from "@truffle/db/logger";
const debug = logger("db:workspace");

import * as Pouch from "./pouch";
import { Collections, definitions } from "./resources";

export type Workspace = Pouch.Workspace<Collections>;

export const attach = Pouch.forDefinitions(definitions);
