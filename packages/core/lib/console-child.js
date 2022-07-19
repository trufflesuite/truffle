const TruffleError = require("@truffle/error");
const Config = require("@truffle/config");
const Web3 = require("web3");
const yargs = require("yargs");

// we split off the part Truffle cares about and need to convert to an array
const input = process.argv[2].split(" -- ");
const inputStrings = input[1].split(" ");

const managedGanacheDefaultHost = "127.0.0.1";
const managedGanacheDefaultPort = 9545;
const managedGanacheDefaultNetworkId = 5777;

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

function getConfiguredNetworkUrl(customConfig) {
  const configuredNetworkOptions = {
    host: customConfig.host || managedGanacheDefaultHost,
    port: customConfig.port || managedGanacheDefaultPort
  };
  return `http://${configuredNetworkOptions.host}:${configuredNetworkOptions.port}/`;
}

let configuredNetwork;
const configNetworkWithProvider =
  detectedConfig.networks[network] && detectedConfig.networks[network].provider;

if (configNetworkWithProvider) {
  // Use "provider" specified in the network config
  configuredNetwork = {
    network_id: "*",
    provider: detectedConfig.networks[network].provider
  };
} else if (url) {
  // Use "url" to configure network (implies not "develop")
  configuredNetwork = {
    network_id: "*",
    url,
    provider: function () {
      return new Web3.providers.HttpProvider(url, {
        keepAlive: false
      });
    }
  };
} else {
  // Otherwise derive network settings
  const customConfig = detectedConfig.networks[network] || {};
  const configuredNetworkUrl = getConfiguredNetworkUrl(customConfig);

  configuredNetwork = {
    host: customConfig.host || managedGanacheDefaultHost,
    port: customConfig.port || managedGanacheDefaultPort,
    network_id: customConfig.network_id || managedGanacheDefaultNetworkId,
    provider: function () {
      return new Web3.providers.HttpProvider(configuredNetworkUrl, {
        keepAlive: false
      });
    }
  };
}

detectedConfig.networks[network] = {
  ...configuredNetwork
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
