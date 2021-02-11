const TruffleError = require("@truffle/error");
const originalRequire = require("original-require");
import path from "path";
import { PluginConstructorOptions, PluginDefinition } from "./types";

export class Plugin {
  constructor({ module, definition }: PluginConstructorOptions) {
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
    return this.commands.includes(commandName);
  }

  loadCommand(commandName: string) {
    const commandLocalPath =
      this.definition.commands && this.definition.commands[commandName];

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

  get tag(): string {
    return this.definition.tag || this.module;
  }

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

    return originalRequire(modulePath);
  }
}
