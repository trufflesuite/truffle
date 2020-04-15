import { Resolver, ResolverSource } from "@truffle/resolver";

export interface ResolveAllSourcesOptions {
  paths: string[];
  resolve(source: UnresolvedSource): Promise<ResolvedSource>;
  getImports(source: ResolvedSource): Promise<string[]>;
}

export interface ResolvedSourcesMapping {
  [filePath: string]: ResolvedSource;
}

export interface UnresolvedSource {
  filePath: string;
  importedFrom?: string;
}

export interface ResolvedSource {
  filePath: string;
  body: string;
  source: ResolverSource;
}

// Resolves sources in several async passes. For each resolved set it detects unknown
// imports from external packages and adds them to the set of files to resolve.
export async function resolveAllSources({
  resolve,
  paths,
  getImports
}: ResolveAllSourcesOptions): Promise<ResolvedSourcesMapping> {
  const mapping: ResolvedSourcesMapping = {};
  const allPaths: (UnresolvedSource | string)[] = paths.slice();

  // Begin generateMapping
  function generateMapping() {
    const promises = [];

    // Dequeue all the known paths, generating resolver promises,
    // We'll add paths if we discover external package imports.
    while (allPaths.length) {
      let filePath;
      let importedFrom = null;

      const candidate = allPaths.shift();

      // Some paths will have been extracted as imports from a file
      // and have information about their parent location we need to track.
      if (typeof candidate === "object") {
        filePath = candidate.filePath;
        importedFrom = candidate.importedFrom;
      } else {
        filePath = candidate;
      }
      promises.push(resolve({ filePath, importedFrom }));
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

        const imports = await getImports(result);

        // Detect unknown external packages / add them to the list of files to resolve
        // Keep track of location of this import because we need to report that.
        for (const item of imports) {
          if (!mapping[item]) {
            allPaths.push({ filePath: item, importedFrom: result.filePath });
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
