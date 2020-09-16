import path from "path";
import fse from "fs-extra";

import { ResolverSource } from "../source";

export class Truffle implements ResolverSource {
  async resolve(importPath: string) {
    let body, filePath;
    if (importPath === "truffle/Console.sol") {
      const actualImportPath =
        // @ts-ignore
        typeof BUNDLE_VERSION !== "undefined"
          ? path.resolve(__dirname, path.basename(importPath))
          : path.resolve(
              __dirname,
              "../../../../core/lib/logging",
              path.basename(importPath)
            );
      body = await fse.readFile(actualImportPath, {
        encoding: "utf8"
      });
      filePath = importPath;
    }

    return { body, filePath };
  }

  require(importPath: string): null {
    return null;
  }

  // Here we're resolving from local files to local files, all absolute.
  resolveDependencyPath(importPath: string, dependencyPath: string) {
    const dirname = path.dirname(importPath);
    return path.resolve(path.join(dirname, dependencyPath));
  }
}
