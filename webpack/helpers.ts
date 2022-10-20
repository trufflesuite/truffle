import fs from "fs";
import path from "path";
import { Configuration } from "webpack";

export function getPackages(names?: string[] | string): string[] {
  const packages = fs
    .readdirSync(path.resolve(__dirname, "..", "packages"))
    .filter(
      pkg =>
        (fs.existsSync(
          path.join(__dirname, "..", "packages", pkg, "webpack.config.ts")
        ) ||
          fs.existsSync(
            path.join(__dirname, "..", "packages", pkg, "webpack.config.js")
          )) &&
        ((Array.isArray(names) && names.includes(pkg)) ||
          (names && names === pkg) ||
          names === undefined ||
          names === null)
    );
  return packages;
}

export function getPackageConfig(
  packageName: string,
  env: Record<string, string | number | boolean>,
  argv: Record<string, any>
): Configuration {
  let packageConfig = require(`../packages/${packageName}/webpack.config`);

  packageConfig = packageConfig.default ? packageConfig.default : packageConfig;

  packageConfig =
    typeof packageConfig === "function"
      ? packageConfig(env, argv)
      : packageConfig;

  return packageConfig;
}

export function isProd(env: Record<string, boolean | number | string>) {
  if (env.production === false || env.prod === false) {
    return false;
  }

  if (env.development === true || env.dev === true) {
    return false;
  }

  // default to production unless otherwise specified
  return true;
}

export interface PackagePaths {
  packageDir: string;
  outputDir: string;
}

export function getPackagePaths(packageName: string): PackagePaths {
  if (!packageName) {
    throw new Error(
      "'packageName' argument must be passed when fetching base config"
    );
  }

  const packageDirName =
    packageName.indexOf("/") == -1
      ? packageName
      : packageName.split("/").slice(-1)[0];

  if (!packageDirName) {
    throw new Error(
      `Couldn't resolve package directory name from package name '${packageName}'.`
    );
  }

  const packageDir = path.resolve(__dirname, "..", "packages", packageDirName);

  if (!fs.existsSync(packageDir)) {
    throw new Error(
      `Cannot find package directory for package named '${packageName}' at '${packageDir}'`
    );
  }

  const outputDir = path.resolve(packageDir, "dist");

  return {
    packageDir,
    outputDir
  };
}

export function isTypescriptPackage(packageName: string): boolean {
  const { packageDir } = getPackagePaths(packageName);

  return fs.existsSync(path.resolve(packageDir, "tsconfig.json"));
}

export function getPackageNameFromModuleRequestContext(
  context: string
): string | null {
  while (
    !fs.existsSync(path.join(context, "package.json")) &&
    path.dirname(context) !== context
  ) {
    context = path.dirname(context);
  }

  if (!fs.existsSync(path.join(context, "package.json"))) {
    return null;
  }

  return require(path.join(context, "package.json")).name;
}
