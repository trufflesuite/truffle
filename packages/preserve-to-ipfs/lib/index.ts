/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import type CID from "cids";
import * as Preserve from "@truffle/preserve";

import { connect } from "./connect";
import { upload } from "./upload";

export interface ExecuteOptions extends Preserve.Recipes.ExecuteOptions{
  inputs: {
    "fs-target": Preserve.Target
  }
}

export interface Result {
  "ipfs-cid": CID;
}

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  address: string;
}

export const defaultAddress = "http://localhost:5001";

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-ipfs";

  static help = "Preserve to IPFS";

  inputLabels = ["fs-target"];
  outputLabels = ["ipfs-cid"];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.address || defaultAddress;
  }

  async *execute(
    options: Preserve.Recipes.ExecuteOptions
  ): Preserve.Process<Result> {
    const { address } = this;
    const { inputs, controls } = options;
    const { update } = controls;

    yield* update({ message: "Preserving to IPFS..." });

    const ipfs = yield* connect({ address, controls });

    const { source } = Preserve.Targets.normalize(inputs["fs-target"]);

    const { cid } = yield* upload({ source, ipfs, controls });

    return { "ipfs-cid": cid };
  }
}
