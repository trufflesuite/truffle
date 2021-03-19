/**
 * @module @truffle/preserve-fs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { targetPath } from "./fs";
import { ExecuteOptions, ExecuteResult } from "./types";

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-fs";

  inputLabels: ["path"];
  outputLabels: ["fs-target"];

  async *execute(options: ExecuteOptions): Preserve.Process<ExecuteResult> {
    const { controls } = options;
    const { log } = controls;

    yield* log({ message: "Loading target..." });

    const targetPathOptions = {
      controls: controls,
      path: options.inputs.path,
      verbose: options.settings.verbose ?? true
    };

    const fsTarget = yield* targetPath(targetPathOptions);

    return { "fs-target": fsTarget };
  }
}
