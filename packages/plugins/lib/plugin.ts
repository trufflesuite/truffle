const TruffleError: any = require("@truffle/error");
const originalRequire = require("original-require");
import path from "path";

export class Plugin {
  /**
   * Given a truffle-config-like, find and return all configured plugins
   */
  static list(options: any): Plugin[] {
    const plugins = Plugin.checkPluginModules(options);
    const definitions = Plugin.loadPluginDefinitions(plugins);

    return Object.entries(definitions).map(
      ([pluginModule, definition]) => new Plugin({ pluginModule, definition })
    );
  }

  private constructor({ pluginModule, definition }: PluginConstructorOptions) {
    this.pluginModule = pluginModule;
    this.definition = definition;
  }

  /*
   * `truffle run` support
   */

  get commands(): string[] {
    return Object.keys(this.definition.commands || {});
  }

  definesCommand(commandName: string): boolean {
    const set = new Set(this.commands);
    return set.has(commandName);
  }

  loadCommand(commandName: string) {
    const commandLocalPath = this.definition.commands[commandName];
    if (!commandLocalPath) {
      throw new TruffleError(
        `Plugin ${this.pluginModule} does not define command ${commandName}`
      );
    }

    return this.loadModule(commandLocalPath);
  }

  /*
   * internals
   */

  private pluginModule: string;
  private definition: PluginDefinition;

  private loadModule(localPath: string): any {
    if (path.isAbsolute(localPath)) {
      throw new TruffleError(
        `\nError: Absolute paths not allowed!\nPlease ensure truffle-plugin.json only references paths relative to the plugin root.\n`
      );
    }

    const pluginPath = originalRequire.resolve(this.pluginModule);
    const modulePath = path.resolve(path.dirname(pluginPath), localPath);

    return originalRequire(pluginPath);
  }

  private static checkPluginModules(options: any): string[] {
    originalRequire("app-module-path").addPath(
      path.resolve(options.working_directory, "node_modules")
    );

    // possible TODO: add app-module-path as dependency of originalRequire
    // external interface something like:
    //
    //   originalRequire.addPath("<path-to-truffle-plugin>")
    //
    // and then make originalRequire handle `path.resolve(..., "node_modules")`

    for (const plugin of options.plugins) {
      try {
        originalRequire.resolve(plugin);
      } catch (_) {
        throw new TruffleError(
          `\nError: ${plugin} listed as a plugin, but not found in global or local node modules!\n`
        );
      }
    }

    return options.plugins;
  }

  private static loadPluginDefinitions(plugins: any): PluginDefinitions {
    let pluginConfigs: any = {};
    plugins.forEach((plugin: any) => {
      try {
        pluginConfigs[plugin] = originalRequire(
          `${plugin}/truffle-plugin.json`
        );
      } catch (_) {
        throw new TruffleError(
          `\nError: truffle-plugin.json not found in the ${plugin} plugin package!\n`
        );
      }
    });

    return pluginConfigs;
  }
}

interface PluginConstructorOptions {
  pluginModule: string; // specified in truffle-config.js; will be require()'d
  definition: PluginDefinition; // loaded from truffle-plugin.json
}

interface PluginDefinitions {
  [plugin: string]: PluginDefinition;
}

interface PluginDefinition {
  preserve?: {
    recipe?: string;
    loader?: string;
  };
  commands?: {
    [commandName: string]: string;
  };
}
