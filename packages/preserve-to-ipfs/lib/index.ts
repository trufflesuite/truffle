/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import CID from "cids";
import * as Preserve from "@truffle/preserve";

import { connect } from "./connect";
import { upload } from "./upload";

export interface Result {
  cid: CID;
}

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  address: string;
}

export const defaultAddress = "http://localhost:5001";

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-ipfs";

  static help = "Preserve to IPFS";

  dependencies: string[] = [];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.address || defaultAddress;
  }

  async *preserve(
    options: Preserve.Recipes.PreserveOptions
  ): Preserve.Process<Result> {
    const { address } = this;
    const { target: rawTarget, controls } = options;
    const { log } = controls;

    yield* log({ message: "Preserving to IPFS..." });

    const ipfs = yield* connect({ address, controls });

    const { source } = Preserve.Targets.normalize(rawTarget);

    const { cid } = yield* upload({ source, ipfs, controls });

    return { cid };
  }
}
