import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch");

export { Definition, Definitions } from "./types";

import * as Adapters from "./adapters";
export { Adapters };

import { Collections } from "@truffle/db/meta/collections";
import { Workspace } from "@truffle/db/meta/data";
import { Definitions } from "./types";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => <N extends Adapters.AdapterName>(
  options: Adapters.AttachOptions<N>
): Workspace<C> => {
  const { constructor, settings } = Adapters.concretize<C, N>(options);

  debug("Initializing workspace...");
  // @ts-ignore
  const workspace = new constructor({ definitions, settings });

  return workspace;
};
