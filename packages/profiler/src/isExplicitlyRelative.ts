import debugModule from "debug";
const debug = debugModule("profiler:isExplicitlyRelative");

export function isExplicitlyRelative(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}
