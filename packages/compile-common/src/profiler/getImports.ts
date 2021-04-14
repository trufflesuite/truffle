import debugModule from "debug";
const debug = debugModule("compile-common:profiler:getImports");

//HACK: do *not* import ResolvedSource from @truffle/resolver because
//that would create a circular dependency!
//don't import ResolverSource for the same reasons
export interface ResolvedSource {
  filePath: string;
  body: string;
  source: {
    resolveDependencyPath(importPath: string, dependencyPath: string): string;
  };
}

export interface GetImportsOptions {
  source: ResolvedSource;
  parseImports(body: string): Promise<string[]>;
  shouldIncludePath(filePath: string): boolean;
}

export async function getImports({
  source: { filePath, body, source },
  shouldIncludePath,
  parseImports
}: GetImportsOptions): Promise<string[]> {
  // No imports in vyper!
  if (!shouldIncludePath(filePath) || !parseImports) return [];

  debug("filePath: %s", filePath);

  const imports = await parseImports(body);

  debug("imports: %O", imports);

  // Convert relative dependencies of modules back into module paths.
  // note: the check for what's a relative dependency has been removed from
  // here, that's now the responsibility of the individual resolverSource to check
  return (await Promise.all(imports.map(
    dependencyPath => source.resolveDependencyPath(filePath, dependencyPath)
  ))).filter(path => path); //filter out Vyper failures
}
