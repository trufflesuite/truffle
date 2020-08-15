const Command = require("../lib/command");
const TruffleError = require("@truffle/error");
const Config = require("@truffle/config");
const Web3 = require("web3");

const inputStrings = process.argv[2];
const network = process.argv[3];

//detect config so we can get the provider and resolver without having to serialize
//and deserialize them
const detectedConfig = Config.detect({ network: network });
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

const command = new Command(require("../lib/commands"));

command.run(inputStrings, detectedConfig, error => {
  if (error) {
    // Perform error handling ourselves.
    if (error instanceof TruffleError) {
      console.log(error.message);
    } else {
      // Bubble up all other unexpected errors.
      console.log(error.stack || error.toString());
    }
    process.exit(1);
  }
  process.exit(0);
});
