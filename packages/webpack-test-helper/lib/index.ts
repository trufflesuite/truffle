import fs from "fs";
import path from "path";
import debugModule from "debug";

// ugly hack so that we can access the original require function even though we
// webpack this module
const originalRequire = eval("require");

const debug = debugModule("@truffle/webpack-test-helper");

export class WebpackTestHelper {
  private packageRoot: string;
  private webpackRequire: (id: string) => any;

  constructor(bundledPackageName: string) {
    this.packageRoot = findPackageRoot(bundledPackageName);
    this.webpackRequire = originalRequire(
      path.join(this.packageRoot, "dist", "runtime")
    );
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
      return this.webpackRequire(moduleName);
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
        // The cast to `any` is necessary to support error causes in newer node
        // versions. In older node versions the extra argument is ignored.
        throw new (Error as any)(
          `Module ID "${moduleName}" could not be loaded from ${this.packageRoot}. ` +
            `Either the module ID is incorrect, or it is not included in the bundle. ` +
            `Please check your module ID, package.json, and/or webpack config.`,
          { cause: err }
        );
      }

      throw err;
    }
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
