import { logger } from "@truffle/db/logger";
const debug = logger("db:migrations:after_0.5.11");

import type { Adapter } from "@truffle/db/meta/pouch";
import type { Collections } from "@truffle/db/resources";


export const migration = {
  after: "0.5.11",
  async execute(_adapter: Adapter<Collections>): Promise<void> {

  }
};
