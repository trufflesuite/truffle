import { Sources, CollectedSources } from "./types";
import * as path from "path";

/**
 * Collects sources, targets into collections with OS-independent paths,
 * along with a reverse mapping to the original path (for post-processing)
 *
 * @param originalSources - { [originalSourcePath]: contents }
 * @param originalTargets - originalSourcePath[]
 * @return { sources, targets, originalSourcePaths }
 */
export function collectSources(
  originalSources: Sources,
  originalTargets: string[] = [],
  contractsDirectory: string = "" //only used by Vyper atm
): CollectedSources {
  const mappedResults = Object.entries(originalSources)
    .map(([originalSourcePath, contents]) => ({
      originalSourcePath,
      contents,
      sourcePath: getPortableSourcePath(
        removeRootDirectory(originalSourcePath, contractsDirectory)
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
  // Turn all backslashes into forward slashes
  var replacement = sourcePath.replace(/\\/g, "/");

  // Turn G:/.../ into /G/.../ for Windows
  if (replacement.length >= 2 && replacement[1] === ":") {
    replacement = "/" + replacement;
    replacement = replacement.replace(":", "");
  }

  return replacement;
}

function removeRootDirectory(sourcePath: string, rootDirectory: string): string {
  //make sure root directory doesn't end in a separator
  if (rootDirectory.endsWith(path.sep)) {
    rootDirectory = rootDirectory.slice(0, -1); //remove last character
  }
  return sourcePath.startsWith(rootDirectory)
    ? sourcePath.slice(rootDirectory.length) //remove prefix
    : sourcePath;
}
