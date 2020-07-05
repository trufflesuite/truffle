const { callbackify } = require("util");

const defaultPlugins = ["@truffle/preserve-fs", "@truffle/preserve-to-ipfs"];

module.exports = {
  command: "preserve",
  description:
    "Save data to decentralized storage platforms like IPFS and Filecoin",
  help: async options => {
    const Config = require("@truffle/config");
    const { Plugin } = require("@truffle/plugins");
    const { loadConstructors } = require("./plugins");

    const config = Config.detect(options);
    const plugins = Plugin.list(config, defaultPlugins);

    const { tags, constructors } = loadConstructors(plugins);

    const flags = [];
    for (const [module, tag] of tags.recipes.entries()) {
      const option = `--${tag}`;
      const description = constructors.recipes.get(module).help;

      flags.push({
        option,
        description
      });
    }

    return {
      usage: "truffle preserve [<target-descriptor>...] [--<recipe-tag>...]",
      options: flags
    };
  },
  run: callbackify(async options => {
    const chalk = require("chalk");
    const Config = require("@truffle/config");
    const { Plugin } = require("@truffle/plugins");
    const { loadConstructors, constructPlugins } = require("./plugins");
    const { preserve } = require("@truffle/preserve");

    const config = Config.detect(options);

    const plugins = Plugin.list(config, defaultPlugins);

    const { tags, constructors } = loadConstructors(plugins);

    const environment = (config.environments || {}).development || {};

    const { recipes, loaders } = constructPlugins({
      tags,
      constructors,
      environment
    });

    for (const path of config._) {
      for (const tag of tags.recipes.values()) {
        // check for tag in options (instead of config, for maybe extra safety)
        if (!(tag in options)) {
          continue;
        }

        config.logger.log("");

        config.logger.log(
          `${chalk.gray(">")} Preserving ${path} to ${tag.toUpperCase()}...`
        );

        const results = preserve({
          loaders,
          recipes,
          request: {
            loader: "@truffle/preserve-fs",
            recipe: "@truffle/preserve-to-ipfs",
            settings: new Map([["@truffle/preserve-fs", { path: config._[0] }]])
          }
        });

        config.logger.log("");

        for await (const { label } of results) {
          config.logger.log(
            `  ${chalk.gray("-")} Root CID: ${chalk.bold(label.cid.toString())}`
          );
        }
      }
    }

    config.logger.log("");
  })
};
