import { Mixin } from "ts-mixer";

import {
  Strategy,
  ForbidsLoadingSpecificVersion,
  ForbidsListingVersions
} from "@truffle/supplier";

import { Results } from "./types";

export namespace Native {
  export type Specification = {
    constructor: {
      options: { strategy: "native" };
    };
    results: Results.Specification;
    allowsLoadingSpecificVersion: false;
    allowsListingVersions: false;
  };
}

export class Native
  extends Mixin(ForbidsLoadingSpecificVersion, ForbidsListingVersions)
  implements Strategy<Native.Specification>
{
  async load() {
    return { compile: (): any => null };
  }
}
