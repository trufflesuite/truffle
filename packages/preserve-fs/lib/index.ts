/**
 * @module @truffle/preserve-fs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { targetPath } from "./fs";

export interface Settings {
  path: string;
  verbose?: boolean;
}

export interface LoadOptions extends Preserve.Targets.Loaders.LoadOptions {
  settings: Settings;
  controls: Preserve.Controls;
}

export class Loader implements Preserve.Targets.Loader {
  name = "@truffle/preserve-fs";

  async *load(options: LoadOptions): Preserve.Process<Preserve.Target> {
    const { settings, controls } = options;
    const { path, verbose = false } = settings;

    const { log } = controls;

    yield* log({ message: "Loading target..." });

    return yield* targetPath({
      path,
      verbose,
      controls
    });
  }
}
