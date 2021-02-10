/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:initialize");

import type { Input, IdObject } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";

export function* process(options: {
  input: Input<"projects">;
}): Process<IdObject<"projects">> {
  const { input } = options;
  const [project] = yield* resources.load("projects", [input]);
  return project;
}
