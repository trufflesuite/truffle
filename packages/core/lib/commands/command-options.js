const addOptions = function(command) {
  let options;
  const networkCommands = ["compile", "console", "debug", "deploy", "migrate", "exec"];

  // need to distinguish the develop command here because it doesn't make sense for it to have a network option
  // but maybe there could be a relevant config value
  if(command === "develop") {
    options = [
        {
          option: "--config <file>",
          description:
            "Specify configuration file to be used. The default is truffle-config.js"
        }
    ]
  } else if(networkCommands.includes(command)) {
    options = [
        {
          option: "--network <name>",
          description:
            "Specify the network to use. Network name must exist in the configuration."
        },
        {
          option: "--config",
          description:
            "Specify configuration file to be used. The default is truffle-config.js"
        }
    ]
  } else {
    options = [];
  }

  return options;
};

module.exports = addOptions;
