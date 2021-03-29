/**
 * @module @truffle/preserve-to-buckets
 */ /** */

import * as Preserve from "@truffle/preserve";
import { clear } from "./clear";
import { connect } from "./connect";
import { upload } from "./upload";

// @textile/hub requires a WebSocket API to be available on the global object
if (typeof global !== "undefined") (global as any).WebSocket = require('isomorphic-ws');

export interface Result {

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

  dependencies: string[] = [];

  private key: string;
  private secret: string;
  private bucketName: string;

  constructor(options: ConstructorOptions) {
    this.key = options.key;
    this.secret = options.secret;
    this.bucketName = options.bucketName;
  }

  async *preserve(
    options: Preserve.Recipes.PreserveOptions
  ): Preserve.Process<Result> {
    const { target: rawTarget, controls } = options;
    const { log } = controls;
    const { key, secret, bucketName } = this;

    const target = Preserve.Targets.normalize(rawTarget);

    if (Preserve.Targets.Sources.isContent(target.source)) {
      throw new Error(
        "@truffle/preserve-to-buckets only supports preserving directories."
      );
    }

    yield* log({ message: "Preserving to Textile Buckets..." });

    const { buckets, bucketKey } = yield* connect({ key, secret, bucketName, controls });

    yield* clear({ buckets, bucketKey, controls });

    const { cid } = yield* upload({ target, buckets, bucketKey, controls });

    return { cid };
  }
}
