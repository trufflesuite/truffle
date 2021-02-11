const TruffleError = require("@truffle/error");
const originalRequire = require("original-require");
import path from "path";
import { PluginConfig, PluginDefinitions, TruffleConfig } from "./types";
import { Plugin } from "./Plugin";
import { normalizeConfigPlugins } from "./utils";

export class Plugins {
  /**
   * Given a truffle-config-like, find and return all configured plugins
   */
  static listAll(config: TruffleConfig): Plugin[] {
    const plugins = Plugins.checkPluginModules(config);
    const definitions = Plugins.loadPluginDefinitions(plugins);

    return Object.entries(definitions).map(
      ([module, definition]) => new Plugin({ module, definition })
    );
  }

  /**
   * Given a truffle-config-like and command, find and return all plugins that define the command
   */
  static findPluginsForCommand(
    config: TruffleConfig,
    command: string
  ): Plugin[] {
    const allPlugins = Plugins.listAll(config);

    const pluginsForCommand = allPlugins.filter(plugin =>
      plugin.definesCommand(command)
    );

    return pluginsForCommand;
  }

  /**
   * Given a truffle-config-like, find and return all plugins that define any command
   */
  static listAllCommandPlugins(config: TruffleConfig): Plugin[] {
    const allPlugins = Plugins.listAll(config);

    const pluginsWithCommands = allPlugins.filter(plugin =>
      plugin.commands.length > 0
    );

    return pluginsWithCommands;
  }

  /**
   * Given a truffle-config-like, find and return all plugins that define a loader
   */
  static listAllLoaders(config: TruffleConfig): Plugin[] {
    const allPlugins = Plugins.listAll(config);

    const loaders = allPlugins.filter(plugin => plugin.definesLoader());

    return loaders;
  }

  /**
   * Given a truffle-config-like, find and return all plugins that define a recipe
   */
  static listAllRecipes(config: TruffleConfig): Plugin[] {
    const allPlugins = Plugins.listAll(config);

    const recipes = allPlugins.filter(plugin => plugin.definesRecipe());

    return recipes;
  }

  /*
   * internals
   */

  private static checkPluginModules(config: TruffleConfig) {
    originalRequire("app-module-path").addPath(
      path.resolve(config.working_directory, "node_modules")
    );

    const plugins = normalizeConfigPlugins(config.plugins || []);

    return plugins;
  }

  private static loadPluginDefinitions(
    plugins: PluginConfig[]
  ): PluginDefinitions {
    let pluginConfigs: PluginDefinitions = {};

    for (const { module, tag } of plugins) {
      try {
        const required = originalRequire(`${module}/truffle-plugin.json`);

        const defaultTag = required.preserve && required.preserve.tag;
        required.tag = tag || defaultTag || undefined;

        pluginConfigs[module] = required;
      } catch (_) {
        throw new TruffleError(
          `\nError: truffle-plugin.json not found in the ${module} plugin package!\n`
        );
      }
    }

    return pluginConfigs;
  }
}
