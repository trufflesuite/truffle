const TruffleError = require("@truffle/error");

// we split off the part Truffle cares about and need to convert to an array
const input = process.argv[2].split(" -- ");
const inputStrings = input[1].split(" ");

// we need to make sure this function exists so ensjs doesn't complain as it requires
// getRandomValues for some functionalities - webpack strips out the crypto lib
// so we shim it here
global.crypto = {
  getRandomValues: require("get-random-values")
};

function main() {
  const {
    getCommand,
    prepareOptions,
    runCommand,
    deriveNetworkEnvironment
  } = require("./command-utils");
  const configuredNetwork = deriveNetworkEnvironment(input);
  const command = getCommand({ inputStrings, options: {}, noAliases: false });
  const options = prepareOptions({
    command,
    inputStrings,
    options: configuredNetwork
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
}

main();

module.exports = { main };
