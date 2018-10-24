const pkg = require("../package.json");
const solcpkg = require("solc/package.json");

const info = () => {
  let bundleVersion;
  // NOTE: Webpack will replace BUNDLE_VERSION with a string.
  if (typeof BUNDLE_VERSION != "undefined") {
    bundleVersion = BUNDLE_VERSION;
  }

  return {
    core: pkg.version,
    bundle: bundleVersion,
    solc: solcpkg.version
  };
}

const log = (optionalLogger) => {
  const logger = optionalLogger || console;

  const versionInformation = info();

  const bundle = versionInformation.bundle ? `v${versionInformation.bundle}` : "(unbundled)";

  logger.log(`Truffle ${bundle} (core: ${versionInformation.core})`);
  logger.log(`Solidity v${versionInformation.solc} (solc-js)`);
  logger.log(`Node ${process.version}`);
}

module.exports = {
  log,
  info,
};
