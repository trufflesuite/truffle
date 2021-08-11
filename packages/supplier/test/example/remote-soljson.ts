import { Mixin } from "ts-mixer";

import {
  Strategy,
  AllowsLoadingSpecificVersion,
  AllowsListingVersions
} from "@truffle/supplier";

import { Results } from "./types";

export namespace RemoteSoljson {
  export type Specification = {
    constructor: {
      options: { strategy: "remote-soljson" };
    };
    results: Results.Specification;
    allowsLoadingSpecificVersion: true;
    allowsListingVersions: true;
  };
}

export class RemoteSoljson
  extends Mixin(AllowsLoadingSpecificVersion, AllowsListingVersions)
  implements Strategy<RemoteSoljson.Specification>
{
  async load(_version?: string) {
    return { compile: (): any => null };
  }

  async list(): Promise<string[]> {
    return [];
  }
}
