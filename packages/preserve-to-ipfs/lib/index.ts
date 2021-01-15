/**
 * @module @truffle/preserve-to-ipfs
 */ /** */

import { asyncToArray } from "iter-tools";
import CID from "cids";
import * as Preserve from "@truffle/preserve";
const IpfsHttpClient: any = require("ipfs-http-client");

import { search } from "./search";
import { connect } from "./connect";
import { upload } from "./upload";
import { IpfsClient } from "./adapter";

export interface Label {
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

  dependencies: [] = [];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.address || defaultAddress;
  }

  async *preserve(
    options: Preserve.Recipes.PreserveOptions
  ): Preserve.Process<Label> {
    const { target: rawTarget, controls } = options;

    const { log } = controls;

    yield* log({ message: "Preserving to IPFS..." });

    const ipfs = yield* connect({
      address: this.address,
      controls
    });

    // normalize target
    const { source } = await Preserve.Targets.normalize(rawTarget);

    // depth-first search to add files to IPFS before parent directories
    const data = await asyncToArray(search({ source }));

    const { cid } = yield* upload({
      source,
      data,
      ipfs,
      controls
    });

    return { cid };
  }
}
