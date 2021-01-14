import path from "path";
import { ContractObject } from "@truffle/contract-schema/spec";
import { ResolverSource } from "../source";

export class Vyper implements ResolverSource {
  contractsDirectory: string;
  wrappedSource: ResolverSource;

  constructor(wrappedSource: ResolverSource, contractsDirectory: string) {
    this.wrappedSource = wrappedSource;
    this.contractsDirectory = contractsDirectory;
  }

  require(): ContractObject | null {
    //out of scope for this resolver source
    return null;
  }

  async resolve(importModule: string, importedFrom: string) {
    importedFrom = importedFrom || "";

    const importPath = moduleToPath(importModule); //note: no file extension yet
    const explicitlyRelative = importPath.startsWith("./") ||
      importPath.startsWith("../");

    const possiblePaths = [];
    //first: check for JSON in local directory
    possiblePaths.push(
      path.join(path.dirname(importedFrom), importPath + ".json")
    );
    if(!explicitlyRelative) {
      //next: check for JSON in contracts dir, if not explicitly relative
      possiblePaths.push(
        path.join(this.contractsDirectory, importPath + ".json")
      );
    }
    //next: check for Vyper in local directory
    possiblePaths.push(
      path.join(path.dirname(importedFrom), importPath + ".vy")
    );
    if(!explicitlyRelative) {
      //finally: check for Vyper in contracts dir, if not explicitly relative
      possiblePaths.push(
        path.join(this.contractsDirectory, importPath + ".vy")
      );
    }

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
}

function moduleToPath(moduleName: string): string {
  const initialDotCount = (moduleName.match(/^\.*/) || []).length;
  const withoutInitialDots = moduleName.replace(/^\.*/, "");
  const pathWithoutDots = withoutInitialDots.replace(/\./g, path.sep);
  let initialDothPath;
  switch (initialDots) {
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
