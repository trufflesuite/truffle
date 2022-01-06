import path from "path";
import type { ContractObject } from "@truffle/contract-schema/spec";
import { generateSolidity } from "abi-to-sol";
import type { ResolverSource } from "../source";

export class ABI implements ResolverSource {
  wrappedSource: ResolverSource;

  constructor(wrappedSource: ResolverSource) {
    this.wrappedSource = wrappedSource;
  }

  // requiring artifacts is out of scope for this ResolverSource
  // just return `null` here and let another ResolverSource handle it
  require(): ContractObject | null {
    return null;
  }

  /**
   * @dev This attempts to resolve an ABI JSON file as Solidity using the
   *      abi-to-sol utility.
   *
   *      Note the **precondition** that `compiler`, if passed, will always
   *      refer to a version of solc, since this ResolverSource is explicitly
   *      disabled for Vyper.
   */
  async resolve(
    importPath: string,
    importedFrom: string = "",
    options: { compiler?: { name: string; version: string } } = {}
  ) {
    const { compiler } = options;
    if (!compiler || compiler.name !== "solc") {
      //this resolver source for use by solc only!
      //vyper doesn't need it and would be quite thrown off by it
      return { filePath: undefined, body: undefined };
    }
    let filePath: string | undefined;
    let body: string | undefined;

    if (!importPath.endsWith(".json")) {
      return { filePath, body };
    }

    const resolution = await this.wrappedSource.resolve(
      importPath,
      importedFrom,
      options
    );
    if (resolution.body === undefined) {
      return { filePath, body };
    }

    const solidityVersion = determineSolidityVersion(compiler);

    ({ filePath, body } = resolution);

    // extract basename twice to support .json and .abi.json
    const name = path.basename(path.basename(filePath, ".json"), ".abi");

    try {
      const abi = JSON.parse(body);

      const soliditySource = generateSolidity({
        name,
        abi,
        license: "MIT", // as per the rest of Truffle
        solidityVersion
      });

      return {
        filePath,
        body: soliditySource
      };
    } catch (_) {
      //we use this not-quite-empty Solidity to avoid warnings
      //pragma statement introduced in 0.4.0 so can't go earlier
      //than that :)
      const emptySolidity = `
        // SPDX-License-Identifier: MIT
        pragma solidity >=0.4.0;
      `;
      return {
        filePath,
        body: emptySolidity
      };
    }
  }

  async resolveDependencyPath(importPath: string, dependencyPath: string) {
    //just defer to wrapped source
    return await this.wrappedSource.resolveDependencyPath(
      importPath,
      dependencyPath
    );
  }
}

function determineSolidityVersion(compiler: {
  name: string;
  version: string;
}): string | undefined {
  const { version } = compiler;

  // resolver.resolve's `compiler` option may include the full version string,
  // including commit and build target information. abi-to-sol only accepts a
  // short-form version range, i.e. <major>.<minor>.<patch>
  return version.split("+")[0];
}
