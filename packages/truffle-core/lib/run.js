const TruffleError = require("Truffle-Error");
const flow = require("lodash/fp/flow");
const path = require("path");

const Run = {
  // helpers
  checkPluginConfig(options) {
    let plugins = options.plugins;
    if (!Array.isArray(plugins) || plugins.length === 0)
      throw new TruffleError("\nError: Plugins configured incorrectly.\n");

    console.log(plugins);
    return plugins;
  },

  checkPluginModules(plugins) {
    plugins.forEach(plugin => {
      try {
        require.resolve(plugin);
      } catch {
        console.log(require.main.paths);
        console.log(process.cwd());
        throw new TruffleError(
          `\nError: ${plugin} listed as a plugin, but not found in global or local node modules!\n`
        );
      }
    });
    console.log(plugins);
    return plugins;
  },

  loadPluginModules(plugins) {
    let pluginConfigs = {};
    plugins.forEach(plugin => {
      try {
        pluginConfigs[plugin] = require(`${plugin}/package.json`);
      } catch {
        throw new TruffleError(
          `\nError: truffle-config.json not found in the ${plugin} plugin package!\n`
        );
      }
    });
    console.log(pluginConfigs);
    return pluginConfigs;
  },

  load(options, callback) {
    let loadPlugins = flow(
      this.checkPluginConfig,
      this.checkPluginModules,
      this.loadPluginModules
    );

    return loadPlugins(options);
  },

  parsePluginConfigs(pluginConfigs, customCommand) {
    let pluginCommandObj = {};

    for (let plugin in pluginConfigs) {
      try {
        if (pluginConfigs[plugin].commands[customCommand])
          pluginCommandObj[plugin] =
            pluginConfigs[plugin].commands[customCommand];
      } catch {
        // TODO comment
      }
    }

    if (Object.keys(pluginCommandObj).length === 0)
      throw new TruffleError(`\nError: "${customCommand}" command not supported by any currently configured plugins. Please make sure:
    – your plugin is correctly configured in truffle-config.js
    – the plugin supporting the command you want to use is installed\n`);

    const pluginModule = Object.keys(pluginCommandObj)[0];
    const relativeCommandPath = Object.values(pluginCommandObj)[0];

    if (path.isAbsolute(relativeCommandPath)) {
      throw new TruffleError(
        `\nError: Absolute paths not allowed!\nPlease change the '${customCommand}' path in ${pluginModule}/truffle-plugin.json to a relative path.\n`
      );
    }

    console.log(pluginModule, relativeCommandPath);
    let pluginPath = require.resolve(pluginModule);
    pluginPath = path.dirname(pluginPath);
    console.log(pluginPath);
    pluginPath = path.resolve(pluginPath, relativeCommandPath);
    console.log(pluginPath);

    const commandModule = require(pluginPath);
    console.log(commandModule);
    return commandModule;
  },

  run(pluginConfigs, customCommand) {
    let runCommand = this.parsePluginConfigs(pluginConfigs, customCommand);
    runCommand.command.run(options);
  }
};

module.exports = Run;
