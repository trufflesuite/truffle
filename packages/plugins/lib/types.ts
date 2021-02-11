// plugin configuration as specified in projects' truffle-config.js
// supports either plain module name as string, or wrapper object
export type RawPluginConfig = PluginConfig | string;

// internal representation of a particular plugin configuration
export interface PluginConfig {
  module: string;
  tag?: string;
}

// Partial representation of the truffle-config object
// TODO: Properly define the full interface for this object in the appropriate module and import it here
export interface TruffleConfig {
  plugins: RawPluginConfig[];
  working_directory: string;
}

export interface PluginConstructorOptions {
  module: string; // specified in truffle-config.js; will be require()'d
  definition: PluginDefinition; // loaded from truffle-plugin.json
}

export interface PluginDefinitions {
  [plugin: string]: PluginDefinition;
}

// As defined in a plugin's truffle-plugin.json file
export interface PluginDefinition {
  // `truffle run` plugin
  commands?: {
    [commandName: string]: string;
  };

  // `truffle preserve` plugin
  tag?: string;
  preserve?: {
    tag?: string;
    recipe?: string;
    loader?: string;
  };
}
