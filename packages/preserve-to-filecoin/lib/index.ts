/**
 * @module @truffle/preserve-to-filecoin
 */ /** */

import type CID from "cids";
import * as Preserve from "@truffle/preserve";

import { connect } from "./connect";
import { getMiners } from "./miners";
import { proposeStorageDeal, StorageDealOptions } from "./storage";
import { wait } from "./wait";

export const defaultAddress = "http://localhost:7777/rpc/v0";

export const defaultStorageDealOptions = {
  epochPrice: "250",
  duration: 518400, // 180 days
};

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  address: string;
  token?: string;
  storageDealOptions?: StorageDealOptions;
}

export interface PreserveOptions extends Preserve.Recipes.ExecuteOptions {
  inputs: {
    "fs-target": Preserve.Target;
    "ipfs-cid": CID;
  };
}

export interface Result {
  "filecoin-deal-cid": CID;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-filecoin";
  static help = "Preserve to Filecoin";

  inputLabels = ["fs-target", "ipfs-cid"];
  outputLabels = ["filecoin-deal-cid"];

  private address: string;
  private token?: string;
  private storageDealOptions?: StorageDealOptions;

  constructor(options: ConstructorOptions) {
    this.address = options.address || defaultAddress;
    this.token = options.token;
    this.storageDealOptions = {
      ...defaultStorageDealOptions,
      ...options.storageDealOptions
    };
  }

  async *execute(options: PreserveOptions): Preserve.Process<Result> {
    const { address: url, token, storageDealOptions } = this;
    const { inputs, controls } = options;
    const { update } = controls;

    if (Preserve.Targets.Sources.isContent(inputs["fs-target"].source)) {
      throw new Error(
        "@truffle/preserve-to-filecoin only supports preserving directories at this time."
      );
    }

    const cid = inputs["ipfs-cid"];

    yield* update({ message: "Preserving to Filecoin..." });

    const client = yield* connect({ url, token, controls });

    const miners = yield* getMiners({ client, controls });

    const { dealCid } = yield* proposeStorageDeal({
      cid,
      client,
      storageDealOptions,
      miners,
      controls
    });

    yield* wait({ client, dealCid, controls });

    return { "filecoin-deal-cid": dealCid };
  }
}
