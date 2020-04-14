import { Resolver } from "@truffle/resolver";

import { ResolvedSourcesMapping } from "./types";

// Resolves sources in several async passes. For each resolved set it detects unknown
// imports from external packages and adds them to the set of files to resolve.
export async function resolveAllSources(
  resolver: Resolver,
  initialPaths: ({ file: string; parent: string } | string)[],
  getImports: any
): Promise<ResolvedSourcesMapping> {
  const mapping: ResolvedSourcesMapping = {};
  const allPaths = initialPaths.slice();

  // Begin generateMapping
  function generateMapping() {
    const promises = [];

    // Dequeue all the known paths, generating resolver promises,
    // We'll add paths if we discover external package imports.
    while (allPaths.length) {
      let file;
      let parent = null;

      const candidate = allPaths.shift();

      // Some paths will have been extracted as imports from a file
      // and have information about their parent location we need to track.
      if (typeof candidate === "object") {
        file = candidate.file;
        parent = candidate.parent;
      } else {
        file = candidate;
      }
      promises.push(resolver.resolve(file, parent));
    }

    // Resolve everything known and add it to the map, then inspect each file's
    // imports and add those to the list of paths to resolve if we don't have it.
    return Promise.all(promises).then(async results => {
      // Generate the sources mapping
      for (const item of results) {
        mapping[item.filePath] = Object.assign({}, item);
      }

      // Queue unknown imports for the next resolver cycle
      while (results.length) {
        const result = results.shift();

        const imports = await getImports(result.filePath, result);

        // Detect unknown external packages / add them to the list of files to resolve
        // Keep track of location of this import because we need to report that.
        for (const item of imports) {
          if (!mapping[item]) {
            allPaths.push({ file: item, parent: result.filePath });
          }
        }
      }
    });
  }
  // End generateMapping

  while (allPaths.length) {
    await generateMapping();
  }
  return mapping;
}
