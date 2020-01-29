const pkg = require("../package.json");
const { CompilerSupplier } = require("@truffle/compile-solidity");
const Config = require("@truffle/config");

const info = config => {
  let bundleVersion;
  // NOTE: Webpack will replace BUNDLE_VERSION with a string.
  if (typeof BUNDLE_VERSION != "undefined") bundleVersion = BUNDLE_VERSION;

  let supplierOptions;
  if (config && config.compilers) {
    supplierOptions = {
      events: config.events,
      solcConfig: config.compilers.solc
    };
  } else {
    const { events, compilers } = new Config();
    const solcConfig = compilers.solc;
    supplierOptions = { events, solcConfig };
  }
  const supplier = new CompilerSupplier(supplierOptions);

  return {
    core: pkg.version,
    bundle: bundleVersion,
    solc: supplier.version
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
    const versionInformation = info(config);
    solcVersion = versionInformation.solc;
    logger.log(`Solidity v${solcVersion} (solc-js)`);
  }
};

const logWeb3 = (logger = console) => {
  const web3Version = pkg.dependencies.web3;
  logger.log(`Web3.js v${web3Version}`);
};

const logAll = (logger = console, config) => {
  const versionInformation = info(config);
  logTruffle(logger, versionInformation);
  logSolidity(logger, versionInformation, config);
  logNode(logger);
  logWeb3(logger);
};

const logTruffleAndNode = (logger = console, config) => {
  const versionInformation = info(config);
  logTruffle(logger, versionInformation);
  logNode(logger);
};

module.exports = {
  logAll,
  info,
  logTruffleAndNode
};
