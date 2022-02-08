const TruffleError = require("@truffle/error");

const Run = {
  // executes command or throws user helpful error
  run(customCommand, config, done) {
    const { Plugins } = require("@truffle/plugins");
    const [foundPlugin] = Plugins.findPluginsForCommand(config, customCommand);

    if (!foundPlugin) {
      throw new TruffleError(
        `\nError: "${customCommand}" command not supported by any currently configured plugins. Please make sure:
  – plugins are correctly configured in truffle-config.js
  – the plugin supporting the command you want to use is installed\n`
      );
    }

    // Will throw an error if loading fails, indicating misconfiguration
    const runCommand = foundPlugin.loadCommand(customCommand);

    const commandResult = runCommand(config, done);
    if (commandResult && typeof commandResult.then === "function") {
      commandResult.then(() => done()).catch(err => done(err));
    }
  }
};

module.exports = Run;
