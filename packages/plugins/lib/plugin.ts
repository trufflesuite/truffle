const TruffleError: any = require("@truffle/error");
const originalRequire = require("original-require");
import path from "path";

export type ConfigPlugins = ConfigPlugin[];
export type ConfigPlugin = string | PluginConfig;
export interface PluginConfig {
  tag?: string;
  module: string;
}

export const resolves = (module: string) => {
  try {
    originalRequire.resolve(module);
    return true;
  } catch (_) {
    return false;
  }
};

export const normalizeConfigPlugins = (
  plugins: ConfigPlugins,
  defaultPlugins: string[]
): PluginConfig[] => {
  const map: Map<string, PluginConfig> = new Map([]);

  const normalized = plugins.map((plugin: ConfigPlugin) =>
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

  for (const module of defaultPlugins) {
    // silently ignore missing default plugins
    if (!map.has(module) && resolves(module)) {
      map.set(module, { module });
    }
  }

  return [...map.values()];
};

export class Plugin {
  /**
   * Given a truffle-config-like, find and return all configured plugins
   */
  static list(options: any, defaultPlugins: string[] = []): Plugin[] {
    const plugins = Plugin.checkPluginModules(options, defaultPlugins);
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
  get tag(): string {
    return this.definition.tag || this.module;
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
        `Plugin ${this.module} does not define command ${commandName}`
      );
    }

    return this.loadModule(commandLocalPath);
  }

  /*
   * `truffle preserve` support
   */

  definesRecipe(): boolean {
    return !!(this.definition.preserve && this.definition.preserve.recipe);
  }

  definesLoader(): boolean {
    return !!(this.definition.preserve && this.definition.preserve.loader);
  }

  loadRecipe(): any {
    if (!this.definesRecipe()) {
      throw new TruffleError(
        `Plugin ${this.module} does not define a \`truffle preserve\` recipe.`
      );
    }

    return this.loadModule(this.definition.preserve.recipe).Recipe;
  }

  loadLoader(): any {
    if (!this.definesLoader()) {
      throw new TruffleError(
        `Plugin ${this.module} does not define a \`truffle preserve\` loader.`
      );
    }

    return this.loadModule(this.definition.preserve.loader).Loader;
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

  private static checkPluginModules(options: any, defaultPlugins: string[]) {
    originalRequire("app-module-path").addPath(
      path.resolve(options.working_directory, "node_modules")
    );

    // possible TODO: add app-module-path as dependency of originalRequire
    // external interface something like:
    //
    //   originalRequire.addPath("<path-to-truffle-plugin>")
    //
    // and then make originalRequire handle `path.resolve(..., "node_modules")`

    const plugins = normalizeConfigPlugins(
      options.plugins || [],
      defaultPlugins
    );

    return plugins;
  }

  private static loadPluginDefinitions(
    plugins: PluginConfig[]
  ): PluginDefinitions {
    let pluginConfigs: PluginDefinitions = {};

    for (const { tag, module } of plugins) {
      try {
        const required: any = originalRequire(`${module}/truffle-plugin.json`);

        required.tag =
          tag ||
          (required.preserve && required.preserve.defaultTag) ||
          undefined;

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
  tag?: string;

  preserve?: {
    defaultTag?: string;
    recipe?: string;
    loader?: string;
  };

  commands?: {
    [commandName: string]: string;
  };
}
