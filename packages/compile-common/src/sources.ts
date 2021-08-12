import type { Sources, CollectedSources } from "./types";
import * as path from "path";

/**
 * Collects sources, targets into collections with OS-independent paths,
 * along with a reverse mapping to the original path (for post-processing)
 *
 * @param originalSources - { [originalSourcePath]: contents }
 * @param originalTargets - originalSourcePath[]
 * @param baseDirectory - a directory to remove as a prefix
 * @param replacement - what to replace it with
 * @return { sources, targets, originalSourcePaths }
 */
export function collectSources(
  originalSources: Sources,
  originalTargets: string[] = [],
  baseDirectory: string = "",
  replacement: string = "/"
): CollectedSources {
  const mappedResults = Object.entries(originalSources)
    .map(([originalSourcePath, contents]) => ({
      originalSourcePath,
      contents,
      sourcePath: getPortableSourcePath(
        replaceRootDirectory(originalSourcePath, baseDirectory, replacement)
      )
    }))
    .map(({ originalSourcePath, sourcePath, contents }) => ({
      sources: {
        [sourcePath]: contents
      },

      // include transformed form as target if original is a target
      targets: originalTargets.includes(originalSourcePath) ? [sourcePath] : [],

      originalSourcePaths: {
        [sourcePath]: originalSourcePath
      }
    }));

  const defaultAccumulator = {
    sources: {},
    targets: [] as string[],
    originalSourcePaths: {}
  };

  return mappedResults.reduce(
    (accumulator, result) => ({
      sources: Object.assign({}, accumulator.sources, result.sources),
      targets: [...accumulator.targets, ...result.targets],
      originalSourcePaths: Object.assign(
        {},
        accumulator.originalSourcePaths,
        result.originalSourcePaths
      )
    }),
    defaultAccumulator
  );
}

/**
 * @param sourcePath - string
 * @return string - operating system independent path
 * @private
 */
function getPortableSourcePath(sourcePath: string): string {
  let replacement = sourcePath;
  //on Windows, replace backslashes with forward slashes
  if (path.sep === '\\') {
    replacement = sourcePath.replace(/\\/g, "/");
  }

  // Turn G:/.../ into /G/.../ for Windows
  if (replacement.length >= 2 && replacement[1] === ":") {
    replacement = "/" + replacement;
    replacement = replacement.replace(":", "");
  }

  return replacement;
}

function replaceRootDirectory(
  sourcePath: string,
  rootDirectory: string,
  replacement: string
): string {
  //make sure root directory ends in a separator
  if (!rootDirectory.endsWith(path.sep)) {
    rootDirectory = rootDirectory + path.sep;
  }
  return sourcePath.startsWith(rootDirectory)
    ? replacement + sourcePath.slice(rootDirectory.length) //remove prefix
    : sourcePath;
}
