const TruffleError: any = require("@truffle/error");
const originalRequire = require("original-require");
import path from "path";

// plugin configuration as specified in projects' truffle-config.js
// supports either plain module name as string, or wrapper object
export type RawPluginConfig = PluginConfig | string;

// internal representation of a particular plugin configuration
export interface PluginConfig {
  module: string;
}

/**
 * Returns true or false based on whether or not a particular plugin
 * resolves successfully
 */
export const resolves = (module: string): boolean => {
  try {
    originalRequire.resolve(module);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Takes a list of raw plugin configurations and returns a list of normalized
 * internal representations
 */
export const normalizeConfigPlugins = (
  plugins: RawPluginConfig[]
): PluginConfig[] => {
  const map: Map<string, PluginConfig> = new Map([]);

  const normalized = plugins.map((plugin: RawPluginConfig) =>
    typeof plugin === "string" ? { module: plugin } : plugin
  );

  for (const plugin of normalized) {
    // fatal error if we can't load a plugin listed in truffle-config.js
    if (!resolves(plugin.module)) {
      throw new TruffleError(
        `\nError: ${module} listed as a plugin, but not found in global or local node modules!\n`
      );
    }

    map.set(plugin.module, plugin);
  }

  return [...map.values()];
};

export class Plugin {
  /**
   * Given a truffle-config-like, find and return all configured plugins
   */
  static list(options: any): Plugin[] {
    const plugins = Plugin.checkPluginModules(options);
    const definitions = Plugin.loadPluginDefinitions(plugins);

    return Object.entries(definitions).map(
      ([module, definition]) => new Plugin({ module, definition })
    );
  }

  private constructor({ module, definition }: PluginConstructorOptions) {
    this.module = module;
    this.definition = definition;
  }

  public module: string;

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
        `Plugin ${this.module} does not define command ${commandName}`
      );
    }

    return this.loadModule(commandLocalPath);
  }

  /*
   * internals
   */

  private definition: PluginDefinition;

  private loadModule(localPath: string): any {
    if (path.isAbsolute(localPath)) {
      throw new TruffleError(
        `\nError: Absolute paths not allowed!\nPlease ensure truffle-plugin.json only references paths relative to the plugin root.\n`
      );
    }

    const pluginPath = originalRequire.resolve(this.module);
    const modulePath = path.resolve(path.dirname(pluginPath), localPath);

    return originalRequire(pluginPath);
  }

  private static checkPluginModules(options: any) {
    originalRequire("app-module-path").addPath(
      path.resolve(options.working_directory, "node_modules")
    );

    // possible TODO: add app-module-path as dependency of originalRequire
    // external interface something like:
    //
    //   originalRequire.addPath("<path-to-truffle-plugin>")
    //
    // and then make originalRequire handle `path.resolve(..., "node_modules")`

    const plugins = normalizeConfigPlugins(options.plugins || []);

    return plugins;
  }

  private static loadPluginDefinitions(
    plugins: PluginConfig[]
  ): PluginDefinitions {
    let pluginConfigs: PluginDefinitions = {};

    for (const { module } of plugins) {
      try {
        const required: any = originalRequire(`${module}/truffle-plugin.json`);

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

interface PluginConstructorOptions {
  module: string; // specified in truffle-config.js; will be require()'d
  definition: PluginDefinition; // loaded from truffle-plugin.json
}

interface PluginDefinitions {
  [plugin: string]: PluginDefinition;
}

interface PluginDefinition {
  commands?: {
    [commandName: string]: string;
  };
}
