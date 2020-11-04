import { logger } from "@truffle/db/logger";
const debug = logger("db:workspace");

import { forDefinitions } from "@truffle/db/pouch";
import * as Pouch from "@truffle/db/pouch";
import { Collections, definitions } from "@truffle/db/definitions";

export type Workspace = Pouch.Workspace<Collections>;

export const attach = forDefinitions(definitions);
