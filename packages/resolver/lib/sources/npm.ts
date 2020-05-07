import path from "path";
import fs from "fs";

import { ResolverSource } from "../source";

export class NPM implements ResolverSource {
  workingDirectory: string;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  require(import_path: string, search_path: string) {
    if (import_path.indexOf(".") === 0 || import_path.indexOf("/") === 0) {
      return null;
    }
    var contract_name = path.basename(import_path, ".sol");
    var regex = new RegExp(`(.*)/${contract_name}`);
    let package_name = "";
    var matched = regex.exec(import_path);
    if (matched) {
      package_name = matched[1];
    }
    var expected_path = path.join(
      search_path || this.workingDirectory,
      "node_modules",
      package_name,
      "build",
      "contracts",
      contract_name + ".json"
    );
    try {
      var result = fs.readFileSync(expected_path, "utf8");
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
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

  // We're resolving package paths to other package paths, not absolute paths.
  // This will ensure the source fetcher conintues to use the correct sources for packages.
  // i.e., if some_module/contracts/MyContract.sol imported "./AnotherContract.sol",
  // we're going to resolve it to some_module/contracts/AnotherContract.sol, ensuring
  // that when this path is evaluated this source is used again.
  resolveDependencyPath(import_path: string, dependency_path: string) {
    var dirname = path.dirname(import_path);
    return path.join(dirname, dependency_path);
  }
}
