const debug = require("debug")("lib:run");
const TruffleError = require("Truffle-Error");
const originalRequire = require("original-require");
const flow = require("lodash/fp/flow");
const path = require("path");

const Run = {
  // helpers
  checkPluginConfig(options) {
    let plugins = options.plugins;
    if (!Array.isArray(plugins) || plugins.length === 0) {
      throw new TruffleError("\nError: Plugins configured incorrectly.\n");
    }

    debug("plugins %o", plugins);
    return plugins;
  },

  checkPluginModules(plugins) {
    // TODO will need to replace with actual config path
    originalRequire("app-module-path").addPath(
      path.resolve(process.cwd(), "node_modules")
    );

    // possible TODO: add app-module-path as dependency of originalRequire
    // external interface something like:
    //
    //   originalRequire.addPath("<path-to-truffle-config>")
    //
    // and then make originalRequire handle `path.resolve(..., "node_modules")`

    plugins.forEach(plugin => {
      try {
        originalRequire.resolve(plugin);
      } catch (_) {
        debug("require.main.paths %o", originalRequire.main.paths);
        debug("process.cwd %o", process.cwd());
        throw new TruffleError(
          `\nError: ${plugin} listed as a plugin, but not found in global or local node modules!\n`
        );
      }
    });
    debug("plugins %o", plugins);
    return plugins;
  },

  loadPluginModules(plugins) {
    let pluginConfigs = {};
    plugins.forEach(plugin => {
      try {
        pluginConfigs[plugin] = originalRequire(`${plugin}/package.json`);
      } catch (_) {
        throw new TruffleError(
          `\nError: truffle-config.json not found in the ${plugin} plugin package!\n`
        );
      }
    });
    debug("pluginConfigs %o", pluginConfigs);
    return pluginConfigs;
  },

  load(options) {
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
      } catch (_) {
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

    debug(
      "pluginModule %o, relativeCommandPath %o",
      pluginModule,
      relativeCommandPath
    );
    let pluginPath = originalRequire.resolve(pluginModule);
    pluginPath = path.dirname(pluginPath);
    debug("pluginPath %o", pluginPath);
    pluginPath = path.resolve(pluginPath, relativeCommandPath);
    debug("pluginPath %o", pluginPath);

    const commandModule = originalRequire(pluginPath);
    debug("commandModule %o", commandModule);
    return commandModule;
  },

  run(pluginConfigs, customCommand) {
    let runCommand = this.parsePluginConfigs(pluginConfigs, customCommand);
    runCommand.command.run(options);
  }
};

module.exports = Run;
