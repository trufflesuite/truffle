import path from "path";
import { ContractObject } from "@truffle/contract-schema/spec";
import { generateSolidity } from "abi-to-sol";

import { FS } from "./fs";

export class ABI extends FS {
  // requiring artifacts is out of scope for this ResolverSource
  // just return `null` here and let another ResolverSource handle it
  require(): ContractObject | null {
    return null;
  }

  async resolve(importPath: string, importedFrom: string = "") {
    let filePath: string | undefined;
    let body: string | undefined;

    if (!importPath.endsWith(".json")) {
      return { filePath, body };
    }

    const resolution = await super.resolve(importPath, importedFrom);
    if (!resolution.body) {
      return { filePath, body };
    }

    ({ filePath, body } = resolution);

    // extract basename twice to support .json and .abi.json
    const name = path.basename(path.basename(filePath, ".json"), ".abi");

    try {
      const abi = JSON.parse(body);

      const soliditySource = generateSolidity({
        name,
        abi,
        license: "MIT" // as per the rest of Truffle
      });

      return {
        filePath,
        body: soliditySource
      };
    } catch (e) {
      const emptySolidity = `
        // SPDX-License-Identifier: MIT
        pragma solidity >0.0.0;
      `;
      return {
        filePath,
        body: emptySolidity
      };
    }
  }
}
