const TruffleError = require("@truffle/error");
const Config = require("@truffle/config");
const yargs = require("yargs");
const path = require("path");
const {
  deriveConfigEnvironment,
  parseQuotesAndEscapes
} = require("./command-utils");

// we split off the part Truffle cares about and need to convert to an array
const input = process.argv[2].split(" -- ");
const escapeCharacters = path.sep === "\\" ? "^`" : "\\"; //set escape character
//based on current OS; backslash for Unix, caret or grave for Windows
const inputStrings = parseQuotesAndEscapes(input[1], escapeCharacters);

// we need to make sure this function exists so ensjs doesn't complain as it requires
// getRandomValues for some functionalities - webpack strips out the crypto lib
// so we shim it here
global.crypto = {
  getRandomValues: require("get-random-values")
};

function deriveConfig() {
  //detect config so we can get the provider and resolver without having to serialize
  //and deserialize them
  const { network, config, url } = yargs(input[0]).argv;
  const detectedConfig = Config.detect({ network, config });
  return deriveConfigEnvironment(detectedConfig, network, url);
}

function main() {
  const { getCommand, prepareOptions, runCommand } = require("./command-utils");
  const config = deriveConfig();
  const command = getCommand({ inputStrings, options: {}, noAliases: false });
  const options = prepareOptions({
    command,
    inputStrings,
    options: config
  });

  runCommand(command, options)
    .then(returnStatus => {
      process.exitCode = returnStatus;
      return require("@truffle/promise-tracker").waitForOutstandingPromises();
    })
    .then(() => process.exit())
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
