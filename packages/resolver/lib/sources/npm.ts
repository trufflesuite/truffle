import path from "path";
import fs from "fs";

import type { ResolverSource } from "../source";

export class NPM implements ResolverSource {
  workingDirectory: string;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  require(importPath: string, searchPath: string) {
    if (importPath.indexOf(".") === 0 || importPath.indexOf("/") === 0) {
      return null;
    }
    const contractName = path.basename(importPath, ".sol");
    const regex = new RegExp(`(.*)/${contractName}`);
    let packageName = "";
    const matched = regex.exec(importPath);
    if (matched) {
      packageName = matched[1];
    }
    // during testing a temp dir is passed as search path - we need to check the
    // working dir in case a built contract was not copied over to it
    for (const basePath of [searchPath, this.workingDirectory]) {
      if (!basePath) {
        continue;
      }
      const result = this.resolveAndParse(basePath, packageName, contractName);
      // result is null if it fails to resolve
      if (result) {
        return result;
      }
      continue;
    }
    return null;
  }

  async resolve(import_path: string, _imported_from: string) {
    // If nothing's found, body returns `undefined`
    var body: string | undefined;
    var modulesDir = this.workingDirectory;

    while (true) {
      var expected_path = path.join(modulesDir, "node_modules", import_path);

      try {
        var body = fs.readFileSync(expected_path, { encoding: "utf8" });
        break;
      } catch (err) {}

      // Recurse outwards until impossible
      var oldModulesDir = modulesDir;
      modulesDir = path.join(modulesDir, "..");
      if (modulesDir === oldModulesDir) {
        break;
      }
    }
    return { body, filePath: import_path };
  }

  resolveAndParse(basePath: string, packageName: string, contractName: string) {
    const packagePath = path.join(basePath, "node_modules", packageName);
    const subDirs = [`build${path.sep}contracts`, "build"];
    for (const subDir of subDirs) {
      const possiblePath = path.join(
        packagePath,
        subDir,
        `${contractName}.json`
      );
      try {
        const result = fs.readFileSync(possiblePath, "utf8");
        return JSON.parse(result);
      } catch (e) {
        continue;
      }
    }
    return null;
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
    return path.join(dirname, dependencyPath);
  }
}
