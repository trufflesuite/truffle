const Command = require("../lib/command");
const TruffleError = require("@truffle/error");
const Config = require("@truffle/config");
const Web3 = require("web3");
const yargs = require("yargs");

const input = process.argv[2].split(" -- ");
const inputStrings = input[1];

// we need to make sure this function exists so ensjs doesn't complain as it requires
// getRandomValues for some functionalities - webpack strips out the crypto lib
// so we shim it here
global.crypto = {
  getRandomValues: require("get-random-values")
};

//detect config so we can get the provider and resolver without having to serialize
//and deserialize them
const { network, config } = yargs(input[0]).argv;
const detectedConfig = Config.detect({ network, config });
const customConfig = detectedConfig.networks.develop || {};

//need host and port for provider url
const ganacheOptions = {
  host: customConfig.host || "127.0.0.1",
  port: customConfig.port || 9545
};
const url = `http://${ganacheOptions.host}:${ganacheOptions.port}/`;

//set up the develop network to use, including setting up provider
detectedConfig.networks.develop = {
  host: customConfig.host || "127.0.0.1",
  port: customConfig.port || 9545,
  network_id: customConfig.network_id || 5777,
  provider: function () {
    return new Web3.providers.HttpProvider(url, { keepAlive: false });
  }
};

const command = new Command(require("./commands"));

command
  .run(inputStrings, detectedConfig)
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
