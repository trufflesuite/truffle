module.exports = async options => {
  const { TruffleError } = require("@truffle/error");
  const { Plugins } = require("@truffle/plugins");
  const { getConfig, constructRecipes } = require("./plugins");
  const { preserve, ConsoleReporter } = require("@truffle/preserve");
  const semver = require("semver");

  if (!semver.satisfies(process.version, ">=12")) {
    throw new TruffleError(
      `The current version of Node (${process.version}) does not support \`truffle preserve\`, please update to Node >=12`
    );
  }

  const config = getConfig(options);

  const environments = config.environments || {};

  if (config.environment && !(config.environment in environments)) {
    throw new TruffleError(
      `Unknown environment: ${config.environment}. Check your truffle-config.js?`
    );
  }

  const plugins = Plugins.listAllRecipes(config);
  const environment = environments[config.environment || "development"];
  const recipes = constructRecipes(plugins, environment);

  // check for tag in options (instead of config, for maybe extra safety)
  const recipePlugin = plugins.find(plugin => plugin.tag in options);

  if (!recipePlugin) {
    throw new TruffleError("No (valid) recipe specified");
  }

  const [recipe] = constructRecipes([recipePlugin], environment);

  if (config._.length === 0) {
    throw new TruffleError("No preserve target specified");
  }

  for (const path of config._) {
    config.logger.log();
    const message = `Preserving target: ${path}`;
    config.logger.log(message);
    config.logger.log("=".repeat(message.length));

    const reporter = new ConsoleReporter({ console: config.logger });

    // The specified path and the truffle config are passed as initial inputs
    // that can be used by any recipe.
    const inputs = { path, config };

    await reporter.report(
      preserve({
        recipes,
        request: { recipe, inputs }
      })
    );

    config.logger.log();
  }
};
