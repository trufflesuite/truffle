/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import * as Preserve from "@truffle/preserve";

import {
  preserveToFilecoin,
  IPFSCidGetter,
  FilecoinStorageResult
} from "./filecoin";

export { preserveToFilecoin, IPFSCidGetter };

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  filecoin: {
    address: string;
  };
  getIPFSCidForTarget: IPFSCidGetter;
}

export interface PreserveOptions extends Preserve.Recipes.PreserveOptions {
  target: Preserve.Target;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-filecoin";

  dependencies: string[] = ["@truffle/preserve-to-ipfs"];

  private address: string;
  private getIPFSCidForTarget: IPFSCidGetter;

  constructor(options: ConstructorOptions) {
    this.address = options.filecoin.address;
    this.getIPFSCidForTarget = options.getIPFSCidForTarget;
  }

  async preserve(options: PreserveOptions): Promise<FilecoinStorageResult> {
    const { target } = options;

    return await preserveToFilecoin({
      target,
      filecoin: {
        address: this.address
      },
      getIPFSCidForTarget: this.getIPFSCidForTarget
    });
  }
}
