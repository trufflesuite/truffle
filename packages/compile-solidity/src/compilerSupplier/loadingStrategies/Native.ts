import { execSync } from "child_process";
import { normalizeSolcVersion } from "../normalizeSolcVersion";
import { NoVersionError } from "../errors";

import { CompilerSupplier } from "@truffle/compile-common";

import type { Results } from "@truffle/compile-solidity/compilerSupplier/types";

export namespace Native {
  export type Specification = {
    constructor: {
      options: void
    };
    results: Results.Specification;
    allowsLoadingSpecificVersion: false;
    allowsListingVersions: false;
  };
}

export class Native implements CompilerSupplier.Strategy<Native.Specification> {
  allowsLoadingSpecificVersion() {
    return false;
  }

  allowsListingVersions() {
    return false;
  }

  async load() {
    const versionString = this.validateAndGetSolcVersion();
    const command = "solc --standard-json";
    const maxBuffer = 1024 * 1024 * 10;

    try {
      return {
        solc: {
          compile: options =>
            String(execSync(command, { input: options, maxBuffer })),
          version: () => versionString
        }
      };
    } catch (error) {
      if (error.message === "No matching version found") {
        throw new NoVersionError(versionString);
      }
      throw new Error(error);
    }
  }

  validateAndGetSolcVersion() {
    let version;
    try {
      version = execSync("solc --version");
    } catch (error) {
      throw new NoNativeError(error);
    }
    return normalizeSolcVersion(version);
  }
}

export class NoNativeError extends Error {
  constructor(error) {
    super("Could not execute local solc binary: " + error);
  }
}
