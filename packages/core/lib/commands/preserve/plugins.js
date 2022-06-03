const Config = require("@truffle/config");

const getConfig = options => {
  let config;
  try {
    config = Config.detect(options);
  } catch (_) {
    config = Config.default().with(options);
  }

  config.plugins = config.plugins || [];
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
