/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import chalk from "chalk";
import * as Preserve from "@truffle/preserve";

import { Label, preserve } from "./ipfs";

export { Label, preserve };

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  address: string;
}

export interface PreserveOptions extends Preserve.Recipes.PreserveOptions {
  target: Preserve.Target;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-ipfs";

  static help = "Preserve to IPFS";

  dependencies: [] = [];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.address;
  }

  async *preserve(options: PreserveOptions) {
    return yield* preserve({
      ...options,
      ipfs: {
        address: this.address
      }
    });
  }
}
