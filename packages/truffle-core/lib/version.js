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
};

const logTruffle = (logger = console, versionInformation) => {
  const bundle = versionInformation.bundle
    ? `v${versionInformation.bundle}`
    : "(unbundled)";
  logger.log(`Truffle ${bundle} (core: ${versionInformation.core})`);
};

const logNode = (logger = console) => {
  logger.log(`Node ${process.version}`);
};

const logSolidity = (logger = console, versionInformation, config) => {
  let solcVersion;
  if (
    config &&
    config.compilers &&
    config.compilers.solc &&
    config.compilers.solc.version
  ) {
    solcVersion = config.compilers.solc.version;
    logger.log(`Solidity - ${solcVersion} (solc-js)`);
  } else {
    const versionInformation = info();
    solcVersion = versionInformation.solc;
    logger.log(`Solidity v${solcVersion} (solc-js)`);
  }
};

const logWeb3 = (logger = console) => {
  const web3Version = pkg.dependencies.web3;
  logger.log(`Web3.js v${web3Version}`);
};

const logAll = (logger = console, config) => {
  const versionInformation = info();
  logTruffle(logger, versionInformation);
  logSolidity(logger, versionInformation, config);
  logNode(logger);
  logWeb3(logger);
};

const logTruffleAndNode = (logger = console) => {
  const versionInformation = info();
  logTruffle(logger, versionInformation);
  logNode(logger);
};

module.exports = {
  logAll,
  info,
  logTruffleAndNode
};
