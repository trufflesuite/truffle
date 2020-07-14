/**
 * @module @truffle/preserve-fs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { targetPath } from "./fs";

export interface LoadOptions {
  path: string;
  controls: Preserve.Controls;
}

export class Loader implements Preserve.Targets.Loader {
  name = "@truffle/preserve-fs";

  async *load(options: LoadOptions): Preserve.Process<Preserve.Target> {
    const {
      path,
      controls: { log }
    } = options;

    yield* log({ message: "Loading target..." });

    return yield* targetPath(options);
  }
}
