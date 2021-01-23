import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:process");

import type { Collections } from "@truffle/db/meta/collections";

export type { Process, Processor, ProcessRequest, RequestType } from "./types";
export type {
  ResourceProcessors,
  ResourceProcessorsOptions
} from "./resources";
export type { ProcessorRunner } from "./run";

export type { Definition, Definitions } from "./types";

import type { Definitions } from "./types";
import { runForDefinitions } from "./run";
import { resourceProcessorsForDefinitions } from "./resources";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => ({
  forDb: runForDefinitions<C>(definitions),
  resources: resourceProcessorsForDefinitions(definitions)
});
