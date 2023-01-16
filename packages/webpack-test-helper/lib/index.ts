import fs from "fs";
import path from "path";
import debugModule from "debug";
import stringSimilarity from "string-similarity";

// ugly hack so that we can access the original require function even though we
// webpack this module
const originalRequire = eval("require");

const debug = debugModule("@truffle/webpack-test-helper");

interface WebpackRequire {
  (id: string): any;

  // purposefully leaving this opaque, as we don't care about anything here but
  // the keys in the index signature
  m: { [id: string]: unknown };
}

export class WebpackTestHelper {
  private packageRoot: string;
  private webpackRequire: WebpackRequire;

  constructor(bundledPackageName: string) {
    this.packageRoot = findPackageRoot(bundledPackageName);
    this.webpackRequire = originalRequire(
      path.join(this.packageRoot, "dist", "runtime")
    );

    // populate the module listing in this.webpackRequire.m by loading the main chunk
    originalRequire(path.join(this.packageRoot, "dist"));
  }

  /**
   * Loads the requested module from a given webpack bundle
   */
  require<T>(moduleName: string): T {
    debug(`Loading module ${moduleName}`);

    if (moduleName.startsWith(".")) {
      debug(
        `Module ${moduleName} is relative, passing it on to __webpack_require__ without modification`
      );
      try {
        return this.webpackRequire(moduleName);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          err.message.endsWith(
            "Cannot read properties of undefined (reading 'call')"
          )
        ) {
          throw this._getMissingModuleError(moduleName, err);
        } else {
          throw err;
        }
      }
    }

    const absoluteModulePath = originalRequire.resolve(moduleName);
    let relativeModulePath = path.relative(
      this.packageRoot,
      absoluteModulePath
    );
    if (!relativeModulePath.startsWith(".")) {
      relativeModulePath = `./${relativeModulePath}`;
    }

    relativeModulePath = relativeModulePath.replace(/\\/g, "/");

    debug(
      `Module ${moduleName} is absolute, converted to absolute path '${absoluteModulePath}', relative path '${relativeModulePath}'`
    );

    try {
      return this.webpackRequire(relativeModulePath);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.endsWith(
          "Cannot read properties of undefined (reading 'call')"
        )
      ) {
        throw this._getMissingModuleError(moduleName, err);
      } else {
        throw err;
      }
    }
  }

  private _getMissingModuleError(moduleName: string, err: Error) {
    const { key: mostSimilarKey, score: similarityScore } = Object.keys(
      this.webpackRequire.m
    )
      .map(key => ({
        key,
        score: stringSimilarity.compareTwoStrings(key, moduleName)
      }))
      // find maximum key similarity score using reduce function
      .reduce((max, current) => (current.score > max.score ? current : max), {
        key: null,
        score: -1
      });

    if (similarityScore > 0.5) {
      // The cast to `any` is necessary to support error causes in newer node
      // versions. In older node versions the extra argument is ignored.
      return new (Error as any)(
        `Module ID "${moduleName}" could not be loaded from ${this.packageRoot}. ` +
          `Either the module ID is incorrect, or it is not included in the bundle. ` +
          `Did you mean "${mostSimilarKey}"?`,
        { cause: err }
      );
    }

    // The cast to `any` is necessary to support error causes in newer node
    // versions. In older node versions the extra argument is ignored.
    return new (Error as any)(
      `Module ID "${moduleName}" could not be loaded from ${this.packageRoot}. ` +
        `Either the module ID is incorrect, or it is not included in the bundle. ` +
        `Please check your module ID, package.json, and/or webpack config.`,
      { cause: err }
    );
  }
}

// export it as default so it can be consumed in All The Ways
export default WebpackTestHelper;

/**
 * Given a resolvable module name, resolves the module and walks up the fs tree
 * until a package.json is found. When found, it returns the path to the
 * directory that contains that file.
 */
function findPackageRoot(moduleName: string) {
  let candidate = path.dirname(originalRequire.resolve(moduleName));

  while (candidate != path.dirname(candidate)) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
    candidate = path.dirname(candidate);
  }

  throw new Error(`Package root could not be found for module ${moduleName}`);
}
