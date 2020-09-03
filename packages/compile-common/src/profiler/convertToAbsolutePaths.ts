import path from "path";

import { isExplicitlyRelative } from "./isExplicitlyRelative";

export function convertToAbsolutePaths(
  paths: string[],
  base: string
): string[] {
  return paths
    .map(p => {
      // If it's anabsolute paths, leave it alone.
      if (path.isAbsolute(p)) return p;

      // If it's not explicitly relative, then leave it alone (i.e., it's a module).
      if (!isExplicitlyRelative(p)) return p;

      // Path must be explicitly releative, therefore make it absolute.
      return path.resolve(path.join(base, p));
    })
    .sort();
}
