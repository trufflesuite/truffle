import path from "path";
import fs from "fs";
import semver from "semver";

import type { Results } from "./types";
import { forDefinition } from "@truffle/supplier";
import { Docker, Local, Native, VersionRange } from "./loadingStrategies";

export namespace CompilerSupplier {
  export type Specification = {
    options: {
      solcConfig: {
        docker?: boolean;
        version?: "native" | string;
      };
    };
    results: Results.Specification;
    strategies: {
      docker: Docker.Specification;
      local: Local.Specification;
      native: Native.Specification;
      "version-range": VersionRange.Specification;
    };
  };
}

export const createCompilerSupplier = forDefinition<
  CompilerSupplier.Specification
>({
  determineStrategy(options) {
    const {
      solcConfig: { docker = false, version }
    } = options;

    // docker case: simple flag
    if (docker) {
      return "docker";
    }

    // native case: version passed as string literal `"native"`
    if (version === "native") {
      return "native";
    }

    // local soljson case: version is arguably a path
    if (version && (
      // an absolute path is definitely a path
      path.isAbsolute(version) ||
      // interpret version string as path if its point to real file on disk
      fs.existsSync(version)
    )) {
      return "local";
    }

    // remote soljson case: version is unspecified or conforms to semver
    // (default case)
    if (!version || semver.validRange(version)) {
      return "version-range";
    }

    const message =
      `Could not find a compiler version matching ${version}. ` +
      `compilers.solc.version option must be a string specifying:\n` +
      `   - a path to a locally installed solcjs\n` +
      `   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n` +
      `   - a docker image name (ex: 'stable')\n` +
      `   - 'native' to use natively installed solc\n`;
    throw new Error(message);
  },

  strategyConstructors: {
    "docker": Docker,
    "local": Local,
    "native": Native,
    "version-range": VersionRange
  }
});
