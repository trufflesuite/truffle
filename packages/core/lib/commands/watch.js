const colors = require("colors");
const commandExistsSync = require("command-exists").sync;

const command = {
  command: "watch",
  description:
    "Watch filesystem for changes and rebuild the project automatically",
  builder: {},
  help: {
    usage: "truffle watch",
    options: []
  },
  run: async function (options) {
    const OS = require("os");
    const deprecationMessage = colors.yellow(
      `> The watch command is planned ` +
        `for deprecation in version 6 of Truffle.${OS.EOL}` +
        `> See https://github.com/trufflesuite/truffle/issues/3227 for more ` +
        `information.`
    );
    console.log(deprecationMessage);
    const Config = require("@truffle/config");
    const sane = require("sane");
    const path = require("path");

    const config = Config.detect(options);

    const watchOptions = {
      ignored: [
        "build/**/**",
        /[/\\]\./ // Ignore files prefixed with .
      ]
    };
    // Certain large codebases have trouble with the watch command.
    // Installing watchman resolves some of these issues.
    if (commandExistsSync("watchman")) {
      watchOptions.watchman = true;
    } else {
      config.logger.log(
        "If you have trouble using watch, try installing watchman."
      );
    }

    const watchCallback = filePath => {
      const displayPath = path.join(
        "./",
        filePath.replace(config.working_directory, "")
      );
      config.logger.log(colors.cyan(">> File " + displayPath + " changed."));

      build(config);
    };

    const watcher = sane(config.working_directory, watchOptions);
    watcher.on("change", watchCallback);
    watcher.on("add", watchCallback);
    watcher.on("delete", watchCallback);

    config.logger.log(
      colors.green("Watching for a change in project files...")
    );
  }
};

const build = async config => {
  const Build = require("../build");

  config.logger.log("Rebuilding...");

  try {
    await Build.build(config);
    config.logger.log(
      colors.green("Completed without errors on " + new Date().toString())
    );
  } catch (error) {
    const TruffleError = require("@truffle/error");
    if (error instanceof TruffleError) {
      console.log(error.message);
    } else {
      // Bubble up all other unexpected errors.
      console.log(error.stack || error.toString());
    }
  }
};

module.exports = command;
