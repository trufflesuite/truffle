module.exports = {
  command: "preserve",
  description:
    "Save data to decentralized storage platforms like IPFS and Filecoin",
  help: options => {
    const { TruffleError } = require("@truffle/error");
    const { Plugins } = require("@truffle/plugins");
    const { getConfig } = require("./plugins");
    const semver = require("semver");

    if (!semver.satisfies(process.version, ">=12")) {
      throw new TruffleError(
        `The current version of Node (${process.version}) does not support \`truffle preserve\`, please update to Node >=12`
      );
    }

    const config = getConfig(options);

    const recipes = Plugins.listAllRecipes(config);

    // If a recipe does not define a tag, it is not an end-user recipe
    const recipeFlags = recipes
      .filter(recipe => recipe.tag !== undefined)
      .map(recipe => ({
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
      options: flags,
      allowedGlobalOptions: []
    };
  }
};
