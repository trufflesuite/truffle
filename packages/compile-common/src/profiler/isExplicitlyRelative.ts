export function isExplicitlyRelative(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}
