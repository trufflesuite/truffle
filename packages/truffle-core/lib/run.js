const path = require("path");
const originalRequire = require("original-require");
const TruffleError = require("truffle-error");

const Run = {
  // initiates running the third-party command
  initializeCommand(pluginConfigs, customCommand) {
    let pluginCommandObj = {};

    for (let plugin in pluginConfigs) {
      try {
        if (pluginConfigs[plugin].commands[customCommand])
          pluginCommandObj[plugin] =
            pluginConfigs[plugin].commands[customCommand];
      } catch (_) {
        // not added to pluginCommandObj
        // empty pluginCommandObj handled in checkPluginObject
      }
    }
    this.checkPluginObject(pluginCommandObj, customCommand);

    return this.checkPluginPath(pluginCommandObj, customCommand);
  },

  // ensures third-party command is actually supported by configured plugins
  checkPluginObject(pluginCommandObj, customCommand) {
    if (Object.keys(pluginCommandObj).length === 0)
      throw new TruffleError(`\nError: "${customCommand}" command not supported by any currently configured plugins. Please make sure:
    – plugins are correctly configured in truffle-config.js
    – the plugin supporting the command you want to use is installed\n`);
  },

  // enforces relative command paths
  checkPluginPath(pluginCommandObj, customCommand) {
    const pluginModule = Object.keys(pluginCommandObj)[0];
    const relativeCommandPath = Object.values(pluginCommandObj)[0];

    if (path.isAbsolute(relativeCommandPath))
      throw new TruffleError(
        `\nError: Absolute paths not allowed!\nPlease change the '${customCommand}' path in ${pluginModule}/truffle-plugin.json to a relative path.\n`
      );

    return this.requirePlugin(pluginModule, relativeCommandPath);
  },

  // resolves and requires the plugin script
  requirePlugin(pluginModule, relativeCommandPath) {
    let pluginPath = originalRequire.resolve(pluginModule);
    pluginPath = path.dirname(pluginPath);
    pluginPath = path.resolve(pluginPath, relativeCommandPath);

    const commandModule = originalRequire(pluginPath);
    return commandModule;
  },

  // executes command or throws user helpful error
  run(pluginConfigs, customCommand, config, done) {
    const runCommand = this.initializeCommand(pluginConfigs, customCommand);
    const commandResult = runCommand(config, done);
    if (commandResult && typeof commandResult.then === "function") {
      commandResult.then(() => done()).catch(err => done(err));
    }
  }
};

module.exports = Run;
