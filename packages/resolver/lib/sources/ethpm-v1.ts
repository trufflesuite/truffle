import path from "path";
import fs from "fs";

import { ContractObject } from "@truffle/contract-schema/spec";
import { ResolverSource } from "../source";

export class EthPMv1 implements ResolverSource {
  workingDirectory: string;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  require(importPath: string) {
    if (importPath.indexOf(".") === 0 || importPath.indexOf("/") === 0) {
      return null;
    }

    // Look to see if we've compiled our own version first.
    var contract_name = path.basename(importPath, ".sol");

    // We haven't compiled our own version. Assemble from data in the lockfile.
    var separator = importPath.indexOf("/");
    var package_name = importPath.substring(0, separator);

    var install_directory = path.join(
      this.workingDirectory,
      "installed_contracts"
    );
    var lockfile: any = path.join(install_directory, package_name, "lock.json");

    try {
      lockfile = fs.readFileSync(lockfile, "utf8");
    } catch (e) {
      return null;
    }

    lockfile = JSON.parse(lockfile);

    // TODO: contracts that reference other types
    // TODO: contract types that specify a hash as their key
    // TODO: imported name doesn't match type but matches deployment name
    var contract_types = lockfile.contract_types || {};
    var type = contract_types[contract_name];

    // No contract name of the type asked.
    if (!type) return null;

    var json: ContractObject = {
      abi: type.abi,
      contract_name: contract_name,
      networks: {},
      unlinked_binary: type.bytecode
    };

    // Go through deployments and save all of them
    Object.keys(lockfile.deployments || {}).forEach(function(blockchain) {
      var deployments = lockfile.deployments[blockchain];

      Object.keys(deployments).forEach(function(name) {
        var deployment = deployments[name];
        if (deployment.contract_type === contract_name) {
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
    var package_name = importPath.substring(0, separator);
    var internal_path = importPath.substring(separator + 1);
    var installDir = this.workingDirectory;

    // If nothing's found, body returns `undefined`
    var body;

    while (true) {
      var file_path = path.join(installDir, "installed_contracts", importPath);

      try {
        body = fs.readFileSync(file_path, { encoding: "utf8" });
        break;
      } catch (err) {}

      file_path = path.join(
        installDir,
        "installed_contracts",
        package_name,
        "contracts",
        internal_path
      );

      try {
        body = fs.readFileSync(file_path, { encoding: "utf8" });
        break;
      } catch (err) {}

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
    if (
      !(dependencyPath.startsWith("./") || dependencyPath.startsWith("../"))
    ) {
      //if it's *not* a relative path, return it unchanged
      return dependencyPath;
    }
    var dirname = path.dirname(importPath);
    var resolved_dependency_path = path.join(dirname, dependencyPath);

    // Note: We use `path.join()` here to take care of path idiosyncrasies
    // like joining "something/" and "./something_else.sol". However, this makes
    // paths OS dependent, and on Windows, makes the separator "\". Solidity
    // needs the separator to be a forward slash. Let's massage that here.
    resolved_dependency_path = resolved_dependency_path.replace(/\\/g, "/");

    return resolved_dependency_path;
  }
}
