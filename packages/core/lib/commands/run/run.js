const TruffleError = require("@truffle/error");
const { Plugin } = require("@truffle/plugins");

const Run = {
  // initiates running the third-party command
  initializeCommand(customCommand, plugins) {
    // look for plugin defining customCommand
    for (const plugin of plugins) {
      if (plugin.definesCommand(customCommand)) {
        try {
          return plugin.loadCommand(customCommand);
        } catch (_) {
          // loading fails; try next one
        }
      }
    }

    // customCommand not found or failed to load
    throw new TruffleError(
      `\nError: "${customCommand}" command not supported by any currently configured plugins. Please make sure:
  – plugins are correctly configured in truffle-config.js
  – the plugin supporting the command you want to use is installed\n`
    );
  },

  // executes command or throws user helpful error
  run(customCommand, config, done) {
    const plugins = Plugin.list(config);

    const runCommand = this.initializeCommand(customCommand, plugins);
    const commandResult = runCommand(config, done);
    if (commandResult && typeof commandResult.then === "function") {
      commandResult.then(() => done()).catch(err => done(err));
    }
  }
};

module.exports = Run;
