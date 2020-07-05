/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import * as Preserve from "@truffle/preserve";

import { Label, preserveToIpfs } from "./ipfs";

export { Label };

export { preserveToIpfs };

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  ipfs: {
    address: string;
  };
}

export interface PreserveOptions extends Preserve.Recipes.PreserveOptions {
  target: Preserve.Target;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-ipfs";

  dependencies: [] = [];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.ipfs.address;
  }

  async preserve(options: PreserveOptions): Promise<Label> {
    const { target } = options;

    return await preserveToIpfs({
      target,
      ipfs: {
        address: this.address
      }
    });
  }
}
