import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch");

import type { Collections } from "@truffle/db/meta/collections";
import type { Workspace } from "@truffle/db/meta/data";

import * as Adapters from "./adapters";
export { Adapters };

import { AdapterWorkspace } from "./workspace";

import type { Adapter, Definition, Definitions } from "./types";
export { Adapter, Definition, Definitions };


export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => <N extends Adapters.AdapterName>(
  options?: Adapters.AttachOptions<N>
): Workspace<C> => {
  const { constructor, settings } = Adapters.concretize<C, N>(options);

  debug("Initializing workspace...");
  // @ts-ignore
  const adapter: Adapter<C> = new constructor({ definitions, settings });

  const workspace = new AdapterWorkspace<C>({
    adapter,
    definitions
  });

  return workspace;
};
