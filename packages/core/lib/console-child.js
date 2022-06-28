const TruffleError = require("@truffle/error");
const Config = require("@truffle/config");
const Web3 = require("web3");
const yargs = require("yargs");

// we split off the part Truffle cares about and need to convert to an array
const input = process.argv[2].split(" -- ");
const inputStrings = input[1].split(" ");

// we need to make sure this function exists so ensjs doesn't complain as it requires
// getRandomValues for some functionalities - webpack strips out the crypto lib
// so we shim it here
global.crypto = {
  getRandomValues: require("get-random-values")
};

//detect config so we can get the provider and resolver without having to serialize
//and deserialize them
const { network, config, url } = yargs(input[0]).argv;
const detectedConfig = Config.detect({ network, config });

function getGanacheUrl(customConfig) {
  const ganacheOptions = {
    host: customConfig.host || "127.0.0.1",
    port: customConfig.port || 9545
  };
  return `http://${ganacheOptions.host}:${ganacheOptions.port}/`;
}

let configuredNetwork;

//set up the specified network to use when "url" option is passed with the truffle console command
if (url) {
  configuredNetwork = {
    network,
    network_id: "*",
    url
  };
} else {
  const customConfig = detectedConfig.networks.develop || {};

  configuredNetwork = {
    network: "develop",
    host: customConfig.host || "127.0.0.1",
    port: customConfig.port || 9545,
    network_id: customConfig.network_id || 5777,
    url: getGanacheUrl(customConfig)
  };
}

detectedConfig.networks[network] = {
  ...configuredNetwork,
  provider: function () {
    return new Web3.providers.HttpProvider(configuredNetwork.url, {
      keepAlive: false
    });
  }
};

const { getCommand, prepareOptions, runCommand } = require("./command-utils");
const command = getCommand({ inputStrings, options: {}, noAliases: false });
const options = prepareOptions({
  command,
  inputStrings,
  options: detectedConfig
});

runCommand(command, options)
  .then(() => process.exit(0))
  .catch(error => {
    // Perform error handling ourselves.
    if (error instanceof TruffleError) {
      console.log(error.message);
    } else {
      // Bubble up all other unexpected errors.
      console.log(error.stack || error.toString());
    }
    process.exit(1);
  });
