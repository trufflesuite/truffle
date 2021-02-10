import path from "path";
import fs from "fs";
const detectInstalled: any = require("detect-installed");
const get_installed_path: any = require("get-installed-path");

import { ResolverSource } from "../source";

export class GlobalNPM implements ResolverSource {
  require(importPath: string) {
    if (importPath.indexOf(".") === 0 || path.isAbsolute(importPath)) {
      return null;
    }
    const contract_name = path.basename(importPath, ".sol");

    let [package_name] = importPath.split("/", 1);
    if (detectInstalled.sync(package_name)) {
      const regex = new RegExp(`/${package_name}$`);
      const global_package_path = get_installed_path
        .getInstalledPathSync(package_name)
        .replace(regex, "");
      const expected_path = path.join(
        global_package_path,
        package_name,
        "build",
        "contracts",
        contract_name + ".json"
      );
      try {
        const result = fs.readFileSync(expected_path, "utf8");
        return JSON.parse(result);
      } catch (e) {
        return null;
      }
    }
  }

  async resolve(importPath: string) {
    let [package_name] = importPath.split("/", 1);
    let body;
    if (detectInstalled.sync(package_name)) {
      const regex = new RegExp(`/${package_name}$`);
      const global_package_path = get_installed_path
        .getInstalledPathSync(package_name)
        .replace(regex, "");
      const expected_path = path.join(global_package_path, importPath);
      try {
        body = fs.readFileSync(expected_path, { encoding: "utf8" });
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
