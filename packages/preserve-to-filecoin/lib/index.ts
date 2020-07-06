/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { preserve, FilecoinStorageResult } from "./filecoin";

export { preserveToFilecoin } from "./filecoin";

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  address: string;
}

export interface PreserveOptions extends Preserve.Recipes.PreserveOptions {
  target: Preserve.Target;
  labels: Map<string, any>;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-filecoin";

  static help = "Preserve to Filecoin";

  dependencies: string[] = ["@truffle/preserve-to-ipfs"];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.address;
  }

  async *preserve(options: PreserveOptions) {
    return yield* preserve({
      ...options,
      filecoin: {
        address: this.address
      }
    });
  }
}
