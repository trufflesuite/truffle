import type { Configuration } from "webpack";
import { getPackages, getPackageConfig } from "./helpers";

function config(
  env: Record<string, string | number | boolean>,
  argv: Record<string, any>
): Configuration[] {
  let truffleConfig: Configuration | null = null;

  let configNames: string[] = [];
  const configs = getPackages().flatMap(packageName => {
    // TODO: make it so that we can also apply the base config to truffle-contract

    const packageConfig = getPackageConfig(packageName, env, argv);

    // make sure the truffle webpack depends on all of the others, otherwise
    // the truffle webpack may build before the others and fail to find some
    // files emitted by the builds on which it depends
    if (Array.isArray(packageConfig)) {
      packageConfig.forEach((val, idx) => {
        val.name = val.name || `${packageName}-${idx}`;
        configNames.push(val.name);

        // sadly, if we include these in the actual config it breaks single
        // compiler mode (i.e. running `yarn build` from within the package
        // directory)
        if (val.name === "dashboard-frontend") {
          val.dependencies = ["codec", "decoder", "compile-common"];
        }
      });
    } else {
      packageConfig.name = packageConfig.name || packageName;

      if (packageName === "truffle") {
        truffleConfig = packageConfig;
      } else {
        configNames.push((packageConfig as any).name);
      }
    }

    return packageConfig;
  });

  if (truffleConfig == null) {
    throw new Error("No config for 'truffle' found");
  }

  (truffleConfig as Configuration).dependencies = configNames;

  return configs;
}

export default config;
