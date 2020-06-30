/**
 * @module @truffle/preserve-fs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { targetPath } from "./fs";

export interface LoadOptions {
  path: string;
}

export class Loader implements Preserve.Targets.Loader {
  async load(options: LoadOptions): Promise<Preserve.Target> {
    const { path } = options;
    return await targetPath({ path });
  }
}
