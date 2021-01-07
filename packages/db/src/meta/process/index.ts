import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:process");

import { Collections } from "@truffle/db/meta/collections";

export * from "./types";
import { _ } from "./batch";
export { _ };
import * as Batch from "./batch";
export { Batch };
export * from "./resources";
export * from "./run";

import { Definitions } from "./types";
import { runForDefinitions } from "./run";
import { resourceProcessorsForDefinitions } from "./resources";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => ({
  forDb: runForDefinitions<C>(definitions),
  resources: resourceProcessorsForDefinitions(definitions)
});
