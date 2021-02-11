import { PluginConfig, RawPluginConfig } from "./types";

const TruffleError = require("@truffle/error");
const originalRequire = require("original-require");

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
        `\nError: ${plugin.module} listed as a plugin, but not found in global or local node modules!\n`
      );
    }

    map.set(plugin.module, plugin);
  }

  return [...map.values()];
};
