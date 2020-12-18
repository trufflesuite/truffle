const TruffleError = require("@truffle/error");
const originalRequire = require("original-require");
import path from "path";
import { PluginConfig, PluginDefinitions, TruffleConfig } from "./interfaces";
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

  /*
   * internals
   */

  private static checkPluginModules(config: TruffleConfig) {
    originalRequire("app-module-path").addPath(
      path.resolve(config.working_directory, "node_modules")
    );

    // possible TODO: add app-module-path as dependency of originalRequire
    // external interface something like:
    //
    //   originalRequire.addPath("<path-to-truffle-plugin>")
    //
    // and then make originalRequire handle `path.resolve(..., "node_modules")`

    const plugins = normalizeConfigPlugins(config.plugins || []);

    return plugins;
  }

  private static loadPluginDefinitions(
    plugins: PluginConfig[]
  ): PluginDefinitions {
    let pluginConfigs: PluginDefinitions = {};

    for (const { module } of plugins) {
      try {
        const required = originalRequire(`${module}/truffle-plugin.json`);

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
