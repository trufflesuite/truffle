/**
 * @module @truffle/preserve-to-buckets
 */ /** */

import * as Preserve from "@truffle/preserve";
import type CID from "cids";
import { clear } from "./clear";
import { connect } from "./connect";
import { upload } from "./upload";

// @textile/hub requires a WebSocket API to be available on the global object
if (typeof global !== "undefined") (global as any).WebSocket = require('isomorphic-ws');

export interface ExecuteOptions {
  "fs-target": Preserve.Target
}

export interface Result {
  "ipfs-cid": CID
}

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  key: string;
  secret: string;
  bucketName: string;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-buckets";

  static help = "Preserve to Textile Buckets";

  inputLabels = ["fs-target"];
  outputLabels = ["ipfs-cid"];

  private key: string;
  private secret: string;
  private bucketName: string;

  constructor(options: ConstructorOptions) {
    this.key = options.key;
    this.secret = options.secret;
    this.bucketName = options.bucketName;
  }

  async *execute(
    options: Preserve.Recipes.ExecuteOptions
  ): Preserve.Process<Result> {
    const { inputs, controls } = options;
    const { update } = controls;
    const { key, secret, bucketName } = this;

    const target = Preserve.Targets.normalize(inputs["fs-target"]);

    if (Preserve.Targets.Sources.isContent(target.source)) {
      throw new Error(
        "@truffle/preserve-to-buckets only supports preserving directories."
      );
    }

    yield* update({ message: "Preserving to Textile Buckets..." });

    const { buckets, bucketKey } = yield* connect({ key, secret, bucketName, controls });

    yield* clear({ buckets, bucketKey, controls });

    const { cid } = yield* upload({ target, buckets, bucketKey, controls });

    return { "ipfs-cid": cid };
  }
}
