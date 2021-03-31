const Config = require("@truffle/config");

const defaultPlugins = [
  "@truffle/preserve-fs",
  "@truffle/preserve-to-ipfs",
  "@truffle/preserve-to-filecoin",
  "@truffle/preserve-to-buckets"
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

const constructRecipes = (plugins, environment) => {
  return plugins.map(plugin => {
    const options = (environment || {})[plugin.tag] || {};
    const Recipe = plugin.loadRecipe();
    const recipe = new Recipe(options);
    return recipe;
  });
};

module.exports = {
  getConfig,
  constructRecipes
};
