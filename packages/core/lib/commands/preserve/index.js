module.exports = {
  command: "preserve",
  description:
    "Save data to decentralized storage platforms like IPFS and Filecoin",
  help: async options => {
    const { Plugins } = require("@truffle/plugins");
    const { getConfig } = require("./plugins");

    const config = getConfig(options);

    const recipes = Plugins.listAllRecipes(config);

    const recipeFlags = recipes.map(recipe => ({
      option: `--${recipe.tag}`,
      description: recipe.loadRecipe().help
    }));

    const flags = [
      {
        option: "--environment",
        description:
          "Environment name, as defined in truffle-config `environments` object"
      },
      ...recipeFlags
    ];

    return {
      usage:
        "truffle preserve [--environment=<environment>] <target-path>... --<recipe-tag>",
      options: flags
    };
  },
  run: async options => {
    const TruffleError = require("@truffle/error");
    const { Plugins } = require("@truffle/plugins");
    const { getConfig, constructPlugins } = require("./plugins");
    const { preserve, ConsoleReporter } = require("@truffle/preserve");

    const config = getConfig(options);

    const environments = config.environments || {};

    if (config.environment && !(config.environment in environments)) {
      throw new TruffleError(
        `Unknown environment: ${config.environment}. Check your truffle-config.js?`
      );
    }

    const environment = environments[config.environment || "development"];

    const allPlugins = Plugins.listAll(config);

    const { recipes, loaders } = constructPlugins(allPlugins, environment);

    // check for tag in options (instead of config, for maybe extra safety)
    const recipePlugin = allPlugins.find(
      plugin => plugin.definesRecipe() && plugin.tag in options
    );

    if (!recipePlugin) {
      throw new TruffleError("No (valid) recipe specified");
    }

    const recipe = recipePlugin.module;

    if (config._.length === 0) {
      throw new TruffleError("No preserve target specified");
    }

    for (const path of config._) {
      config.logger.log();
      const message = `Preserving target: ${path}`;
      config.logger.log(message);
      config.logger.log("=".repeat(message.length));

      const reporter = new ConsoleReporter({ console: config.logger });

      await reporter.report(
        preserve({
          recipes,
          loaders,
          request: {
            recipe,
            loader: "@truffle/preserve-fs",
            settings: new Map([
              ["@truffle/preserve-fs", { path, verbose: true }]
            ])
          }
        })
      );

      config.logger.log();
    }
  }
};
