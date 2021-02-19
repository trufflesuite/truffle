const Config = require("@truffle/config");

const defaultPlugins = [
  "@truffle/preserve-fs",
  "@truffle/preserve-to-ipfs"
  // TODO: Uncomment this when preserve-to-filecoin is integrated
  // "@truffle/preserve-to-filecoin"
];

const getConfig = options => {
  let config;
  try {
    config = Config.detect(options);
  } catch (_) {
    config = Config.default().with(options);
  }

  config.plugins = [...(config.plugins || []), ...defaultPlugins];

  return config;
};

const constructPlugins = (plugins, environment) => {
  const recipes = new Map([]);
  const loaders = new Map([]);

  for (const plugin of plugins) {
    const options = (environment || {})[plugin.tag] || {};

    if (plugin.definesLoader()) {
      const constructor = plugin.loadLoader();
      const loader = new constructor(options);
      loaders.set(plugin.module, loader);
    }

    if (plugin.definesRecipe()) {
      const constructor = plugin.loadRecipe();
      const recipe = new constructor(options);
      recipes.set(plugin.module, recipe);
    }
  }

  return { recipes, loaders };
};

module.exports = {
  getConfig,
  constructPlugins
};
