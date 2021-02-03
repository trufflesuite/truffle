import debugModule from "debug";
const debug = debugModule("compile-common:profiler:resolveAllSources");
import { getImports, ResolvedSource } from "./getImports";
//note: see getImports.ts for why we don't import from @truffle/resolver

export interface ResolveAllSourcesOptions {
  paths: string[];
  resolve(source: UnresolvedSource): Promise<ResolvedSource | undefined>;
  parseImports(body: string): Promise<string[]>;
  shouldIncludePath(filePath: string): boolean;
}

export interface ResolvedSourceWithImports extends ResolvedSource {
  imports: string[];
}

export interface ResolvedSourcesMapping {
  [filePath: string]: ResolvedSourceWithImports;
}

export interface UnresolvedSource {
  filePath: string;
  importedFrom?: string;
}

// Resolves sources in several async passes. For each resolved set it detects unknown
// imports from external packages and adds them to the set of files to resolve.
export async function resolveAllSources({
  resolve,
  paths,
  shouldIncludePath,
  parseImports
}: ResolveAllSourcesOptions): Promise<ResolvedSourcesMapping> {
  const mapping: ResolvedSourcesMapping = {};
  const allPaths: (UnresolvedSource | string)[] = paths.slice();
  debug("resolveAllSources called");

  // Begin generateMapping
  async function generateMapping() {
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
    const results = await Promise.all(promises);

    // Queue unknown imports for the next resolver cycle
    while (results.length) {
      const source = results.shift();

      if (!source || mapping[source.filePath]) {
        //skip ones that couldn't be resolved, or are already recorded
        continue;
      }

      const imports = shouldIncludePath(source.filePath)
        ? await getImports({ source, parseImports, shouldIncludePath })
        : [];

      debug("imports: %O", imports);

      // Generate the sources mapping
      mapping[source.filePath] = { ...source, imports };

      // Detect unknown external packages / add them to the list of files to resolve
      // Keep track of location of this import because we need to report that.
      for (const item of imports) {
        if (!mapping[item]) {
          allPaths.push({ filePath: item, importedFrom: source.filePath });
        }
      }
    }
  }
  // End generateMapping

  while (allPaths.length) {
    await generateMapping();
  }
  return mapping;
}
