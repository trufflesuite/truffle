import path from "path";
import fs from "fs";
import glob from "glob";

import { ContractObject } from "@truffle/contract-schema/spec";
import { ResolverSource } from "../source";

export class EthPMv3 implements ResolverSource {
  workingDirectory: string;
  allEthpmFiles: any;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
    this.allEthpmFiles = glob.sync("**/*", {
      cwd: path.join(this.workingDirectory, "_ethpm_packages")
    });
  }

  require(importPath: string) {
    if (importPath.startsWith(".") || importPath.startsWith("/")) {
      return null;
    }

    // Look to see if we've compiled our own version first.
    var contractName = path.basename(importPath, ".sol");

    // We haven't compiled our own version. Assemble from data in the manifest.
    var separator = importPath.indexOf("/");
    var packageName = importPath.substring(0, separator);

    var installDirectory = path.join(this.workingDirectory, "_ethpm_packages");
    var manifest: any = path.join(
      installDirectory,
      packageName,
      "manifest.json"
    );

    try {
      manifest = fs.readFileSync(manifest, "utf8");
    } catch (e) {
      return null;
    }

    manifest = JSON.parse(manifest);

    // TODO: contracts that reference other types
    // TODO: contract types that specify a hash as their key
    // TODO: imported name doesn't match type but matches deployment name
    var contractTypes = manifest.contractTypes || {};
    var type = contractTypes[contractName];

    // No contract name of the type asked.
    if (!type) return null;

    var json: ContractObject = {
      abi: type.abi,
      contractName: contractName,
      networks: {},
      unlinked_binary: type.deploymentBytecode.bytecode
    };

    // Go through deployments and save all of them
    Object.keys(manifest.deployments || {}).forEach(function (blockchain) {
      var deployments = manifest.deployments[blockchain];

      Object.keys(deployments).forEach(function (name) {
        var deployment = deployments[name];
        if (deployment.contractType === contractName) {
          json.networks[blockchain] = {
            events: {},
            links: {},
            address: deployment.address
          };
        }
      });
    });

    return json;
  }

  async resolve(importPath: string) {
    var separator = importPath.indexOf("/");
    var packageName = importPath.substring(0, separator);
    var internalPath = importPath.substring(separator + 1);
    var installDir = this.workingDirectory;

    // If nothing's found, body returns `undefined`
    var body;
    var matches = this.allEthpmFiles.filter((p: any) => p.includes(importPath));

    while (true) {
      // check for root level ethpm sources
      var filePath = path.join(
        installDir,
        "_ethpm_packages",
        packageName,
        "_src",
        internalPath
      );

      try {
        body = fs.readFileSync(filePath, { encoding: "utf8" });
        break;
      } catch (err) {}

      filePath = path.join(
        installDir,
        "installed_contracts",
        packageName,
        "contracts",
        internalPath
      );

      try {
        body = fs.readFileSync(filePath, { encoding: "utf8" });
        break;
      } catch (err) {}

      if (matches.length === 1) {
        try {
          body = fs.readFileSync(
            path.join(installDir, "_ethpm_packages", matches[0]),
            { encoding: "utf8" }
          );
          break;
        } catch (err) {}
      }

      // Recurse outwards until impossible
      var oldInstallDir = installDir;
      installDir = path.join(installDir, "..");
      if (installDir === oldInstallDir) {
        break;
      }
    }
    return { body, filePath: importPath };
  }

  // We're resolving package paths to other package paths, not absolute paths.
  // This will ensure the source fetcher conintues to use the correct sources for packages.
  // i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
  // we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
  // that when this path is evaluated this source is used again.
  resolveDependencyPath(importPath: string, dependencyPath: string) {
    var dirname = path.dirname(importPath);
    var resolvedDependencyPath = path.join(dirname, dependencyPath);

    // Note: We use `path.join()` here to take care of path idiosyncrasies
    // like joining "something/" and "./something_else.sol". However, this makes
    // paths OS dependent, and on Windows, makes the separator "\". Solidity
    // needs the separator to be a forward slash. Let's massage that here.
    resolvedDependencyPath = resolvedDependencyPath.replace(/\\/g, "/");

    return resolvedDependencyPath;
  }
}
