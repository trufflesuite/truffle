/**
 * @module @truffle/preserve-fs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { targetPath } from "./fs";
import { LoadOptions } from "./types";

export class Loader implements Preserve.Loader {
  name = "@truffle/preserve-fs";

  async *load(options: LoadOptions): Preserve.Process<Preserve.Target> {
    const { controls } = options;

    const { log } = controls;

    yield* log({ message: "Loading target..." });

    return yield* targetPath(options);
  }
}
