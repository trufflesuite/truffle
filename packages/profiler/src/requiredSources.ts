import debugModule from "debug";
const debug = debugModule("profiler:requiredSources");

import path from "path";

import {
  resolveAllSources,
  ResolveAllSourcesOptions
} from "./resolveAllSources";

export interface RequiredSourcesOptions {
  allPaths: string[];
  updatedPaths: string[];

  resolve: ResolveAllSourcesOptions["resolve"];
  parseImports: ResolveAllSourcesOptions["parseImports"];

  shouldIncludePath: ResolveAllSourcesOptions["shouldIncludePath"];
}

export interface RequiredSources {
  allSources: {
    [filePath: string]: string;
  };

  compilationTargets: string[];
}

export async function requiredSources({
  allPaths,
  updatedPaths,
  resolve,
  shouldIncludePath,
  parseImports
}: RequiredSourcesOptions): Promise<RequiredSources> {
  const allSources: RequiredSources["allSources"] = {};
  const compilationTargets: string[] = [];

  debug("allPaths: %O", allPaths);
  debug("updatedPaths: %O", updatedPaths);

  //before anything else: on Windows, make sure all paths are in native form
  //(with backslashes) rather than slashes.  otherwise, resolution of relative
  //paths can cause aliasing; you can end up with one source with slashes (as
  //given) and one with backslashes (due to relative import resolution).
  allPaths = allPaths.map(sourcePath => sourcePath.replace(/\//g, path.sep));
  updatedPaths = updatedPaths.map(sourcePath => sourcePath.replace(/\//g, path.sep));

  // Solidity test files might have been injected. Include them in the known set.
  updatedPaths.forEach(_path => {
    if (!allPaths.includes(_path)) {
      allPaths.push(_path);
    }
  });

  //exit out quickly if we've been asked to compile nothing
  if (!updatedPaths.length) {
    return {
      allSources: {},
      compilationTargets: []
    };
  }

  const resolved = await resolveAllSources({
    resolve,
    parseImports,
    shouldIncludePath,
    paths: allPaths
  });

  //exit out semi-quickly if we've been asked to compile everything
  if (listsEqual(updatedPaths, allPaths)) {
    for (const file of Object.keys(resolved)) {
      if (shouldIncludePath(file)) {
        allSources[file] = resolved[file].body;
      }
    }
    return {
      allSources,
      compilationTargets: Object.keys(allSources)
    };
  }


  // Seed compilationTargets with known updates
  for (const update of updatedPaths) {
    if (shouldIncludePath(update)) {
      compilationTargets.push(update);
    }
  }

  debug("entering main loop");

  // While there are updated files in the queue, we take each one
  // and search the entire file corpus to find any sources that import it.
  // Those sources are added to list of compilation targets as well as
  // the update queue because their own ancestors need to be discovered.
  while (updatedPaths.length > 0) {
    const currentUpdate = updatedPaths.shift();
    const files = allPaths.slice();

    // While files: dequeue and inspect their imports
    while (files.length > 0) {
      const currentFile = files.shift();

      // Ignore targets already selected.
      if (compilationTargets.includes(currentFile)) {
        continue;
      }

      debug("currentFile: %s", currentFile);

      const imports = resolved[currentFile].imports;

      debug("imports.length: %d", imports.length);

      // If file imports a compilation target, add it
      // to list of updates and compilation targets
      if (imports.includes(currentUpdate)) {
        updatedPaths.push(currentFile);
        compilationTargets.push(currentFile);
      }
    }
  }

  debug("compilationTargets: %O", compilationTargets);

  //now: crawl the tree downward from the compilation targets
  //to get all the sources we need
  const filesToProcess = compilationTargets.slice(); //clone
  const required = [];
  while (filesToProcess.length > 0) {
    debug("filesToProcess: %O", filesToProcess);
    const file = filesToProcess.shift();
    debug("file: %s", file);
    if (resolved[file]) {
      required.push(file);
      for (const importPath of resolved[file].imports) {
        debug("importPath: %s", importPath);
        if (!required.includes(importPath)) { //don't go into a loop!
          filesToProcess.push(importPath);
        }
      }
    }
  }

  debug("required: %O", required);

  // Generate dictionary of all required sources, including external packages
  for (const file of required) {
    if (shouldIncludePath(file)) {
      allSources[file] = resolved[file].body;
    }
  }

  return {
    allSources,
    compilationTargets
  };
}

function listsEqual<T>(listA: T[], listB: T[]): boolean {
  const a = listA.sort();
  const b = listB.sort();

  return JSON.stringify(a) === JSON.stringify(b);
}
