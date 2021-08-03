import path from "path";
import originalRequire from "original-require";
import solcWrap from "solc/wrapper";
import { Mixin } from "ts-mixer";
import { observeListeners } from "../observeListeners";
import {
  Strategy,
  AllowsLoadingSpecificVersion,
  ForbidsListingVersions
} from "@truffle/supplier";

import type { Results } from "@truffle/compile-solidity/compilerSupplier/types";

export namespace Local {
  export type Specification = {
    constructor: {
      options: {
        solcConfig: {
          version?: string;
        };
      };
    };
    results: Results.Specification;
    allowsLoadingSpecificVersion: true;
    allowsListingVersions: false;
  };
}

export class Local
  extends Mixin(AllowsLoadingSpecificVersion, ForbidsListingVersions)
  implements Strategy<Local.Specification> {
  private localPath: string | undefined;

  constructor({ solcConfig = {} } = {}) {
    super();

    this.localPath = (solcConfig as any).version;
  }

  async load(localPath: string | undefined = this.localPath) {
    if (!localPath) {
      throw new Error("Cannot use Local loading strategy without path");
    }

    const listeners = observeListeners();
    try {
      let soljson, compilerPath;
      compilerPath = path.isAbsolute(localPath)
        ? localPath
        : path.resolve(process.cwd(), localPath);

      try {
        soljson = originalRequire(compilerPath);
      } catch (error) {
        throw new NoPathError(localPath, error);
      }
      //HACK: if it has a compile function, assume it's already wrapped
      return {
        solc: soljson.compile ? soljson : solcWrap(soljson)
      };
    } finally {
      listeners.cleanup();
    }
  }
}

export class NoPathError extends Error {
  constructor(input, error) {
    const message = `Could not find compiler at: ${input}\n\n` + error;
    super(message);
  }
}
