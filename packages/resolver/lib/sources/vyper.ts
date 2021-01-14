import debugModule from "debug";
const debug = debugModule("resolver:sources:vyper");
import path from "path";
import { ContractObject } from "@truffle/contract-schema/spec";
import { ResolverSource } from "../source";

export class Vyper implements ResolverSource {
  wrappedSource: ResolverSource;

  constructor(wrappedSource: ResolverSource) {
    this.wrappedSource = wrappedSource;
  }

  require(): ContractObject | null {
    //out of scope for this resolver source
    return null;
  }

  async resolve(importModule: string, importedFrom: string) {
    importedFrom = importedFrom || "";

    //attempt to just resolve as if it's a file path rather than Vyper module
    const directlyResolvedSource =
        await this.wrappedSource.resolve(importModule, importedFrom);
    if (directlyResolvedSource.body) {
      return directlyResolvedSource;
    }
    //otherwise, it's time for some Vyper module processing...

    const importPath = moduleToPath(importModule); //note: no file extension yet

    const possiblePaths = [];
    //first: check for JSON in local directory
    possiblePaths.push(
      path.join(path.dirname(importedFrom), importPath + ".json")
    );
    //next: check for Vyper in local directory
    possiblePaths.push(
      path.join(path.dirname(importedFrom), importPath + ".vy")
    );

    for (const possiblePath of possiblePaths) {
      const resolvedSource =
        await this.wrappedSource.resolve(possiblePath, importedFrom);

      if (resolvedSource.body) {
        return resolvedSource;
      }
    }

    //if not found, return nothing
    return { body: undefined, filePath: undefined };
  }

  async resolveDependencyPath(importPath: string, dependencyPath: string) {
    //unfortunately, for this sort of source to resolve a dependency path,
    //it's going to need to do a resolve :-/
    const resolved = await this.resolve(dependencyPath, importPath);
    if (resolved) {
      return resolved.filePath;
    } else {
      return null;
    }
  }
}

function moduleToPath(moduleName: string): string {
  const initialDotCount = (moduleName.match(/^\.*/) || []).length;
  const withoutInitialDots = moduleName.replace(/^\.*/, "");
  const pathWithoutDots = withoutInitialDots.replace(/\./g, path.sep);
  let initialDotPath;
  switch (initialDotCount) {
    case 0:
      initialDotPath = "";
      break;
    case 1:
      initialDotPath = "./";
      break;
    default:
      initialDotPath = "../".repeat(initialDotCount - 1);
      break;
  }
  return initialDotPath + pathWithoutDots;
}
