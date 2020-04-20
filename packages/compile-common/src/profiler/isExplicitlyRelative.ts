export function isExplicitlyRelative(importPath: string): boolean {
  return importPath.indexOf(".") === 0;
}
