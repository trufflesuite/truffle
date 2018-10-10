const colors = require("colors");

const command = {
  command: 'watch',
  description: 'Watch filesystem for changes and rebuild the project automatically',
  builder: {},
  help: {
    usage: "truffle watch",
    options: [],
  },
  run: function (options, done) {
    const Config = require("truffle-config");
    const chokidar = require("chokidar");
    const path = require("path");

    const config = Config.detect(options);

    const watchPaths = [
      path.join(config.working_directory, "app/**/*"),
      path.join(config.working_directory, "test/**/*"),
      path.join(config.contracts_directory, "/**/*"),
      path.join(config.working_directory, "truffle-config.js"),
      path.join(config.working_directory, "truffle.js")
    ];

    chokidar.watch(watchPaths, {
      ignored: /[\/\\]\./, // Ignore files prefixed with "."
      cwd: config.working_directory,
      ignoreInitial: true
    })
    .on('all', (event, filePath) => {
      const displayPath = path.join("./", filePath.replace(config.working_directory, ""));
      config.logger.log(colors.cyan(">> File " + displayPath + " changed."));

      build(config);
    });

    config.logger.log(colors.green("Watching for a change in project files..."));
  }
}

const build = (config) => {
  const Build = require("../build");

  config.logger.log("Rebuilding...");

  Build.build(config, function(error) {
    printSummary(config, error);
  });
};

const printSummary = (config, error) => {
  if (error) {
    const TruffleError = require("truffle-error");
    if (error instanceof TruffleError) {
      console.log(error.message);
    } else {
      // Bubble up all other unexpected errors.
      console.log(error.stack || error.toString());
    }
  } else {
    config.logger.log(colors.green("Completed without errors on " + new Date().toString()));
  }
}

module.exports = command;
