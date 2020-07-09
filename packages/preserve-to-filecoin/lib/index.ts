/**
 * @module @truffle/preserve-to-filecoin
 */ /** */

import CID from "cids";
import * as Preserve from "@truffle/preserve";

import { connect } from "./connect";
import { getMiners } from "./miners";
import { proposeStorageDeal } from "./storage";
import { wait } from "./wait";

export const defaultAddress: string = "ws://localhost:7777/0/node/rpc/v0";

export interface ConstructorOptions
  extends Preserve.Recipes.ConstructorOptions {
  address: string;
}

export interface PreserveOptions extends Preserve.Recipes.PreserveOptions {
  target: Preserve.Target;
  labels: Map<string, any>;
}

export interface Label {
  dealCid: CID;
}

export class Recipe implements Preserve.Recipe {
  name = "@truffle/preserve-to-filecoin";

  static help = "Preserve to Filecoin";

  dependencies: string[] = ["@truffle/preserve-to-ipfs"];

  private address: string;

  constructor(options: ConstructorOptions) {
    this.address = options.address || defaultAddress;
  }

  async *preserve(options: PreserveOptions): Preserve.Process<Label> {
    const { target, labels, controls } = options;

    const { log } = controls;

    if (Preserve.Targets.Sources.isContent(target.source)) {
      throw new Error(
        "@truffle/preserve-to-filecoin only supports preserving directories at this time."
      );
    }

    const { cid } = labels.get("@truffle/preserve-to-ipfs");

    yield* log({ message: "Preserving to Filecoin..." });

    const client = yield* connect({
      address: this.address,
      controls
    });

    const miners = yield* getMiners({
      client,
      controls
    });

    const { dealCid } = yield* proposeStorageDeal({
      cid,
      client,
      miners,
      controls
    });

    yield* wait({
      client,
      dealCid,
      controls
    });

    return { dealCid };
  }
}
