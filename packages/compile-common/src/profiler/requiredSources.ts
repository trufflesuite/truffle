import { Resolver } from "@truffle/resolver";

import {
  resolveAllSources,
  ResolvedSource,
  ResolvedSourcesMapping
} from "./resolveAllSources";

export interface RequiredSourcesOptions {
  findContracts(): Promise<string[]>;
  resolver: Resolver;
  getImports(resolvedSource: ResolvedSource): Promise<string[]>;
  shouldIncludePath(filePath: string): boolean;
  updatedPaths: string[];
}

export interface RequiredSources {
  allSources: {
    [filePath: string]: string;
  };

  compilationTargets?: string[];
}

export async function requiredSources({
  updatedPaths,
  findContracts,
  resolver,
  shouldIncludePath,
  getImports
}: RequiredSourcesOptions): Promise<RequiredSources> {
  let allPaths: string[];
  const allSources: RequiredSources["allSources"] = {};
  const compilationTargets: string[] = [];

  // Fetch the whole contract set
  allPaths = await findContracts();

  // Solidity test files might have been injected. Include them in the known set.
  updatedPaths.forEach(_path => {
    if (!allPaths.includes(_path)) {
      allPaths.push(_path);
    }
  });

  const resolved = await resolveAllSources(resolver, allPaths, getImports);

  // Generate hash of all sources including external packages - passed to solc inputs.
  const resolvedPaths = Object.keys(resolved);
  for (const file of Object.keys(resolved)) {
    if (shouldIncludePath(file)) {
      allSources[file] = resolved[file].body;
    }
  }

  // Exit w/out minimizing if we've been asked to compile everything, or nothing.
  if (listsEqual(updatedPaths, allPaths)) {
    return {
      allSources,
      compilationTargets: []
    };
  } else if (!updatedPaths.length) {
    return {
      allSources: {},
      compilationTargets: []
    };
  }

  // Seed compilationTargets with known updates
  for (const update of updatedPaths) {
    compilationTargets.push(update);
  }

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

      const imports = await getImports(resolved[currentFile]);

      // If file imports a compilation target, add it
      // to list of updates and compilation targets
      if (imports.includes(currentUpdate)) {
        updatedPaths.push(currentFile);
        compilationTargets.push(currentFile);
      }
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
