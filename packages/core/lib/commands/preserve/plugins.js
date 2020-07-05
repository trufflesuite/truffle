const loadConstructors = plugins => {
  const tags = {
    recipes: new Map([]),
    loaders: new Map([])
  };

  const modules = {
    recipes: new Map([]),
    loaders: new Map([])
  };

  const constructors = {
    recipes: new Map([]),
    loaders: new Map([])
  };

  for (const plugin of plugins) {
    if (plugin.definesLoader()) {
      const constructor = plugin.loadLoader();
      constructors.loaders.set(plugin.module, constructor);
      tags.loaders.set(plugin.module, plugin.tag);
      modules.loaders.set(plugin.tag, plugin.module);
    }

    if (plugin.definesRecipe()) {
      const constructor = plugin.loadRecipe();
      constructors.recipes.set(plugin.module, constructor);
      tags.recipes.set(plugin.module, plugin.tag);
      modules.recipes.set(plugin.tag, plugin.module);
    }
  }

  return {
    tags,
    modules,
    constructors
  };
};

const constructPlugins = ({ tags, environment, constructors }) => {
  const collections = {}; // loaders and recipes

  for (const kind of Object.keys(constructors)) {
    const collection = new Map([]);

    for (const [module, constructor] of constructors[kind].entries()) {
      const options = {};

      const tag = tags[kind].get(module);

      if (tag in environment) {
        options[module] = environment[tag];
      }

      const plugin = new constructor(options);

      collection.set(module, plugin);
    }

    collections[kind] = collection;
  }

  return collections;
};

module.exports = { loadConstructors, constructPlugins };
