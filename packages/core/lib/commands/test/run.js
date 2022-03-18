const defaultNetworkIdForTestCommand = 4447;

const parseCommandLineFlags = options => {
  // parse out command line flags to merge in to the config
  const grep = options.grep || options.g;
  const bail = options.bail || options.b;
  const reporter = options.reporter || options.r;

  /**
   * Reporter value passed on the command line has precedence over a reporter value in the config.
   * If neither exist, then nothing is passed to mocha and it uses its default reporter type "spec".
   * Note: It is important that reporter be completely omitted, and not be set to undefined!
   * As setting it to undefined will ignore the reporter value specified in the config.
   */
  return reporter === undefined
    ? { mocha: { grep, bail } }
    : { mocha: { grep, bail, reporter } };
};

function sanitizeGanacheOptions(ganacheOptions) {
  const network_id = ganacheOptions.network_id;

  // Use default network_id if "*" is defined in config
  if (network_id === "*") {
    return { ...ganacheOptions, network_id: defaultNetworkIdForTestCommand };
  }

  const parsedNetworkId = parseInt(network_id, 10);
  if (isNaN(parsedNetworkId)) {
    const error =
      `The network id specified in the truffle config ` +
      `(${network_id}) is not valid. Please properly configure the network id as an integer value.`;
    throw new Error(error);
  }
  return { ...ganacheOptions, network_id: parsedNetworkId };
}

module.exports = async function (options) {
  const Config = require("@truffle/config");
  const { Environment, Develop } = require("@truffle/environment");
  const { copyArtifactsToTempDir } = require("./copyArtifactsToTempDir");
  const { determineTestFilesToRun } = require("./determineTestFilesToRun");
  const { prepareConfigAndRunTests } = require("./prepareConfigAndRunTests");

  const optionsToMerge = parseCommandLineFlags(options);
  const config = Config.detect(options).merge(optionsToMerge);

  // if "development" exists, default to using that for testing
  if (!config.network && config.networks.development) {
    config.network = "development";
  }

  if (!config.network) {
    config.network = "test";
  } else {
    await Environment.detect(config);
  }

  // Start managed ganache network
  async function startGanacheAndRunTests(ipcOptions, ganacheOptions, config) {
    const { disconnect } = await Develop.connectOrStart(
      ipcOptions,
      ganacheOptions
    );
    const ipcDisconnect = disconnect;
    await Environment.develop(config, ganacheOptions);
    const { temporaryDirectory } = await copyArtifactsToTempDir(config);
    const numberOfFailures = await prepareConfigAndRunTests({
      config,
      files,
      temporaryDirectory
    });
    ipcDisconnect();
    return numberOfFailures;
  }

  if (config.stacktraceExtra) {
    config.stacktrace = true;
    config.compileAllDebug = true;
  }
  // enables in-test debug() interrupt, or stacktraces, forcing compileAll
  if (config.debug || config.stacktrace || config.compileAllDebug) {
    config.compileAll = true;
  }

  const { file } = options;
  const inputArgs = options._;
  const files = determineTestFilesToRun({
    config,
    inputArgs,
    inputFile: file
  });

  const configuredNetwork = config.networks[config.network];
  const testNetworkDefinedAndUsed =
    configuredNetwork && config.network === "test";
  const noProviderHostOrUrlConfigured =
    configuredNetwork &&
    !configuredNetwork.provider &&
    !configuredNetwork.host &&
    !configuredNetwork.url;
  let numberOfFailures;

  if (
    (testNetworkDefinedAndUsed && noProviderHostOrUrlConfigured) ||
    !configuredNetwork
  ) {
    // Use managed ganache with overriding user specified config or without any specification in the config
    const defaultPort = await require("get-port")();
    const defaultHost = "127.0.0.1";
    const defaultMnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

    // configuredNetwork will spread only when it is defined and ignored when undefined
    const ganacheOptions = {
      host: defaultHost,
      port: defaultPort,
      network_id: defaultNetworkIdForTestCommand,
      mnemonic: defaultMnemonic,
      time: config.genesis_time,
      miner: {
        instamine: "strict"
      },
      ...configuredNetwork
    };

    const sanitizedGanacheOptions = sanitizeGanacheOptions(ganacheOptions);

    const ipcOptions = { network: "test" };
    numberOfFailures = await startGanacheAndRunTests(
      ipcOptions,
      sanitizedGanacheOptions,
      config
    );
  } else {
    // Use unmanaged network with user specified config if provider, host or url exists
    await Environment.detect(config);
    const { temporaryDirectory } = await copyArtifactsToTempDir(config);
    numberOfFailures = await prepareConfigAndRunTests({
      config,
      files,
      temporaryDirectory
    });
  }
  return numberOfFailures;
};
