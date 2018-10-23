const pkg = require("../package.json");
const solcpkg = require("solc/package.json");
const bundle_version = null;

const getVersionInformation = () => {
  // NOTE: Webpack will replace BUNDLE_VERSION with a string.
  if (typeof BUNDLE_VERSION != "undefined") {
    bundle_version = BUNDLE_VERSION;
  }

  let bundleVersion;

  if (version.bundle) {
    bundleVersion = "v" + version.bundle;
  } else {
    bundleVersion = "(unbundled)";
  }
  return {
    core: pkg.version,
    bundle: bundleVersion,
    solc: solcpkg.version
  };
}

const logVersionInformation = (logger) => {
  const versionInformation = getVersionInformation();
  logger.log("Truffle " + versionInformation.bundle + " (core: " + versionInformation.core + ")");
  logger.log("Solidity v" + versionInformation.solc + " (solc-js)");
}

module.exports = {
  logVersionInformation,
  getVersionInformation,
};
