import path from "path";
import fse from "fs-extra";
import { Deployed } from "./Deployed";
import findContracts from "@truffle/contract-sources";
import { ResolverSource } from "../../source";
const contract = require("@truffle/contract");

export class Truffle implements ResolverSource {
  options: any;

  constructor(options: any) {
    this.options = options;
  }

  async resolve(importPath: string) {
    if (importPath === "truffle/DeployedAddresses.sol") {
      const sourceFiles = await findContracts(this.options.contracts_directory);

      let abstractionFiles: string[] =
        fse.existsSync(this.options.contracts_build_directory)
          ? fse.readdirSync(this.options.contracts_build_directory)
          : [];
      const buildDirFiles = abstractionFiles;
      abstractionFiles = buildDirFiles.filter(file => file.match(/^.*.json$/));

      const mapping: { [key: string]: string | false } = {};

      const blacklist = new Set(["Assert", "DeployedAddresses"]);

      // Ensure we have a mapping for source files and abstraction files
      // to prevent any compile errors in tests.
      sourceFiles.forEach((file: string) => {
        const name = path.basename(file, ".sol");
        if (blacklist.has(name)) return;
        mapping[name] = false;
      });

      abstractionFiles.forEach(file => {
        const name = path.basename(file, ".json");
        if (blacklist.has(name)) return;
        mapping[name] = false;
      });

      const filesData = abstractionFiles.map(file => {
        return fse.readFileSync(
          path.join(this.options.contracts_build_directory, file),
          "utf8"
        );
      });

      const addresses = filesData.map(data => {
        const c = contract(JSON.parse(data));
        c.setNetwork(this.options.network_id);
        if (c.isDeployed()) return c.address;
        return null;
      });

      addresses.forEach((address, i) => {
        const name = path.basename(abstractionFiles[i], ".json");

        if (blacklist.has(name)) return;

        mapping[name] = address;
      });

      const addressSource = Deployed.makeSolidityDeployedAddressesLibrary(
        mapping,
        this.options.compilers
      );
      return { body: addressSource, filePath: importPath };
    }

    const truffleLibraries = [
      "Assert",
      "AssertAddress",
      "AssertAddressArray",
      "AssertBalance",
      "AssertBool",
      "AssertBytes32",
      "AssertBytes32Array",
      "AssertGeneral",
      "AssertInt",
      "AssertIntArray",
      "AssertString",
      "AssertUint",
      "AssertUintArray",
      "NewSafeSend",
      "OldSafeSend"
    ];

    for (const lib of truffleLibraries) {
      if (importPath === `truffle/${lib}.sol`) {
        const actualImportPath =
          // @ts-ignore
          typeof BUNDLE_VERSION !== "undefined"
            ? path.resolve(path.join(__dirname, `${lib}.sol`))
            : path.resolve(__dirname, "../../../..", "solidity", `${lib}.sol`);
        const body = fse.readFileSync(actualImportPath, { encoding: "utf8" });
        return { body, filePath: importPath };
      }
    }

    return { body: null, filePath: null };
  }

  require(): null {
    // return null to let another source handle this behavior
    // (will be covered by FS source)
    return null;
  }

  resolveDependencyPath(_importPath: string, dependencyPath: string) {
    return dependencyPath;
  }
}
