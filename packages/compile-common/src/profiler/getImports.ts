import { isExplicitlyRelative } from "./isExplicitlyRelative";

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
  if (!shouldIncludePath(filePath)) return [];

  const imports = await parseImports(body);

  // Convert explicitly relative dependencies of modules back into module paths.
  return imports.map(dependencyPath =>
    isExplicitlyRelative(dependencyPath)
      ? source.resolveDependencyPath(filePath, dependencyPath)
      : dependencyPath
  );
}
