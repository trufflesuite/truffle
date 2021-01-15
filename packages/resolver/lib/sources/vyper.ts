import debugModule from "debug";
const debug = debugModule("resolver:sources:vyper");
import path from "path";
import { ContractObject } from "@truffle/contract-schema/spec";
import { ResolverSource, SourceResolution } from "../source";

export class Vyper implements ResolverSource {
  contractsDirectory: string;
  wrappedSource: ResolverSource;
  //because this ResolverSource has to do an actual resolution just to
  //do a resolveDependencyPath, I'm giving it a cache to prevent redoing
  //the work of resolution later
  cache: {
    [filePath: string]: SourceResolution
  };

  constructor(wrappedSource: ResolverSource, contractsDirectory: string) {
    this.wrappedSource = wrappedSource;
    this.cache = {};
    debug("contractsDirectory: %s", contractsDirectory);
    this.contractsDirectory = contractsDirectory;
  }

  require(): ContractObject | null {
    //out of scope for this resolver source
    return null;
  }

  async resolve(importModule: string, importedFrom: string) {
    importedFrom = importedFrom || "";

    debug("importModule: %s", importModule);
    debug("importedFrom: %s", importedFrom);

    //attempt to just resolve as if it's a file path rather than Vyper module
    const directlyResolvedSource =
        await this.wrappedSource.resolve(importModule, importedFrom);
    if (directlyResolvedSource.body) {
      debug("found directly");
      return directlyResolvedSource;
    }
    //otherwise, it's time for some Vyper module processing...

    //only attempt this if what we have looks like a Vyper module
    if (!importModule.match(/^[\w.]+$/)) {
      debug("clearly not a Vyper module");
      return { body: undefined, filePath: undefined };
    }

    const importPath = moduleToPath(importModule); //note: no file extension yet
    debug("importPath: %s", importPath);
    const explicitlyRelative = importPath.startsWith("./") ||
      importPath.startsWith("../");
    debug("explicitlyRelative: %o", explicitlyRelative);

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
    debug("possiblePaths: %O", possiblePaths);

    for (const possiblePath of possiblePaths) {
      debug("possiblePath: %s", possiblePath);
      const resolvedSource = possiblePath in this.cache
        ? this.cache[possiblePath]
        : await this.wrappedSource.resolve(possiblePath, importedFrom);

      if (!(possiblePath in this.cache)) {
        this.cache[possiblePath] = resolvedSource; //yes, even failures are cached!
      }

      if (resolvedSource.body) {
        debug("found");
        return resolvedSource;
      }
      debug("not found");
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
  //first: get initial dot count by matching against regular expression for
  //initial dots, then taking captured group (note: regular expression
  //will always match so don't have to worry about null here) and taking
  //length
  const initialDotCount = moduleName.match(/^(\.*)/)[1].length;
  //then: change rest of dots to slashes
  const withoutInitialDots = moduleName.slice(initialDotCount);
  const pathWithoutDots = withoutInitialDots.replace(/\./g, path.sep);
  let initialDotPath;
  //then: interpret initial dots
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
  //finally: combine
  return initialDotPath + pathWithoutDots;
}
