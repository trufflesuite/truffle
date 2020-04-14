import { isAbsolute, resolve as resolvePath, join as joinPath } from "path";

import { Resolver } from "@truffle/resolver";

import { isExplicitlyRelative } from "./isExplicitlyRelative";
import { resolveAllSources, ResolvedSourcesMapping } from "./resolveAllSources";

export interface RequiredSourcesOptions {
  findContracts(): Promise<string[]>;
  resolver: Resolver;
  getImports: any;
  shouldIncludePath(filePath: string): boolean;
  basePath: string;
  paths: string[];
}

export interface RequiredSources {
  allSources: {
    [filePath: string]: string;
  };

  compilationTargets?: string[];
}

export async function requiredSources({
  paths,
  basePath,
  findContracts,
  resolver,
  shouldIncludePath,
  getImports
}: RequiredSourcesOptions): Promise<RequiredSources> {
  let allPaths: string[], updates: string[];
  const allSources: RequiredSources["allSources"] = {};
  const compilationTargets: string[] = [];

  // Fetch the whole contract set
  allPaths = await findContracts();

  // Solidity test files might have been injected. Include them in the known set.
  paths.forEach(_path => {
    if (!allPaths.includes(_path)) {
      allPaths.push(_path);
    }
  });

  updates = convertToAbsolutePaths(paths, basePath).sort();

  allPaths = convertToAbsolutePaths(allPaths, basePath).sort();

  const resolved = await resolveAllSources(resolver, allPaths, getImports);

  // Generate hash of all sources including external packages - passed to solc inputs.
  const resolvedPaths = Object.keys(resolved);
  for (const file of Object.keys(resolved)) {
    if (shouldIncludePath(file)) {
      allSources[file] = resolved[file].body;
    }
  }

  // Exit w/out minimizing if we've been asked to compile everything, or nothing.
  if (listsEqual(paths, allPaths)) {
    return {
      allSources,
      compilationTargets: []
    };
  } else if (!paths.length) {
    return {
      allSources: {},
      compilationTargets: []
    };
  }

  // Seed compilationTargets with known updates
  for (const update of updates) {
    compilationTargets.push(update);
  }

  // While there are updated files in the queue, we take each one
  // and search the entire file corpus to find any sources that import it.
  // Those sources are added to list of compilation targets as well as
  // the update queue because their own ancestors need to be discovered.
  while (updates.length > 0) {
    const currentUpdate = updates.shift();
    const files = allPaths.slice();

    // While files: dequeue and inspect their imports
    while (files.length > 0) {
      const currentFile = files.shift();

      // Ignore targets already selected.
      if (compilationTargets.includes(currentFile)) {
        continue;
      }

      const imports = await getImports(currentFile, resolved[currentFile]);

      // If file imports a compilation target, add it
      // to list of updates and compilation targets
      if (imports.includes(currentUpdate)) {
        updates.push(currentFile);
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

function convertToAbsolutePaths(paths: string[], base: string): string[] {
  return paths.map(p => {
    // If it's anabsolute paths, leave it alone.
    if (isAbsolute(p)) return p;

    // If it's not explicitly relative, then leave it alone (i.e., it's a module).
    if (!isExplicitlyRelative(p)) return p;

    // Path must be explicitly releative, therefore make it absolute.
    return resolvePath(joinPath(base, p));
  });
}
