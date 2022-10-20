import { getPackages, getPackageConfig } from "./helpers";

function config(
  env: Record<string, string | number | boolean>,
  argv: Record<string, any>
) {
  // return getPackages("workflow-compile").map(packageName => {
  return getPackages().map(packageName => {
    // TODO: make it so that we can also apply the base config to truffle-contract

    const packageConfig = getPackageConfig(packageName, env, argv);

    return packageConfig;
  });
}

export default config;
