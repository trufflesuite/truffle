import path from "path";
import fs from "fs";
const detectInstalled = require("detect-installed");
const getInstalledPath = require("get-installed-path");

import type { ResolverSource } from "../source";
import { debug } from "console";
import { ContractObject } from "@truffle/contract-schema";

const getGlobalPackagePath = (packageName: string): string | null => {
  const suffix = `${path.sep}${packageName}`;
  let globalPackagePath: string | null = null;

  globalPackagePath = getInstalledPath.getInstalledPathSync(packageName);
  //we should catch the error from getInstalledPathSync
  if (globalPackagePath) {
    globalPackagePath = globalPackagePath.endsWith(suffix)
      ? globalPackagePath.slice(0, globalPackagePath.length - suffix.length)
      : globalPackagePath;

    return globalPackagePath;
  } else {
    return null;
  }
};
export class GlobalNPM implements ResolverSource {
  require(importPath: string): ContractObject | null {
    if (importPath.startsWith(".") || path.isAbsolute(importPath)) {
      return null;
    }
    const contractName = path.basename(importPath, ".sol");
    let [packageName] = importPath.split("/", 1);

    const globalPackagePath = getGlobalPackagePath(packageName);

    if (detectInstalled.sync(packageName)) {
      const result = this.resolveAndParse(
        globalPackagePath,
        packageName,
        contractName
      );
      // result is null if it fails to resolve
      if (result) {
        return result;
      }
    }
    return null;
  }

  resolveAndParse(basePath: string, packageName: string, contractName: string) {
    const packagePath = path.join(basePath, packageName);
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
      } catch {
        continue;
      }
    }
    return null;
  }

  async resolve(importPath: string) {
    let [packageName] = importPath.split("/", 1);
    let body;
    if (detectInstalled.sync(packageName)) {
      const expectedPath = path.join(
        await getGlobalPackagePath(packageName),
        importPath
      );
      try {
        body = fs.readFileSync(expectedPath, { encoding: "utf8" });
      } catch (err) {}
    }

    // If nothing's found, body returns `undefined`
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
    return path.join(dirname, dependencyPath);
  }
}
