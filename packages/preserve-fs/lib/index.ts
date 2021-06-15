/**
 * @module @truffle/preserve-fs
 */ /** */

import type * as Preserve from "@truffle/preserve";

import { targetPath } from "./fs";

export interface ExecuteOptions extends Preserve.Recipes.ExecuteOptions {
  inputs: { path: string };
  settings: { verbose?: boolean };
}

export interface ExecuteResult {
  "fs-target": Preserve.Target;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-fs";

  inputLabels = ["path"];
  outputLabels = ["fs-target"];

  async *execute(options: ExecuteOptions): Preserve.Process<ExecuteResult> {
    const { controls } = options;
    const { update } = controls;

    yield* update({ message: "Loading target..." });

    const targetPathOptions = {
      controls: controls,
      path: options.inputs.path,
      verbose: options.settings.verbose ?? true
    };

    const fsTarget = yield* targetPath(targetPathOptions);

    return { "fs-target": fsTarget };
  }
}
