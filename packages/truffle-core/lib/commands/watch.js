const command = {
  command: 'watch',
  description: 'Watch filesystem for changes and rebuild the project automatically',
  builder: {},
  help: {
    usage: "truffle watch",
    options: [],
  },
  run: function (options, done) {
    const Build = require("../build");
    const colors = require("colors");
    const Config = require("truffle-config");
    const chokidar = require("chokidar");
    const path = require("path");
    const Contracts = require("truffle-workflow-compile");
    const TruffleError = require("truffle-error");

    const config = Config.detect(options);

    let working = false;
    let needsRebuild = true;
    let needsRecompile = true;

    const watchPaths = [
      path.join(config.working_directory, "app/**/*"),
      path.join(config.contracts_build_directory, "/**/*"),
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

      needsRebuild = true;

      const contractsDirectoryChanged = path.join(config.working_directory, filePath)
                                          .indexOf(config.contracts_directory) >= 0;
      if (contractsDirectoryChanged) {
        needsRecompile = true;
      }
    });

    const checkIfBuildOrCompileNecessary = () => {
      if (working) {
        setTimeout(checkIfBuildOrCompileNecessary, 200);
        return;
      }

      if (needsRebuild) {
        needsRebuild = false;

        if (config.build != null) {
          config.logger.log("Rebuilding...");
          working = true;

          Build.build(config, function(error) {
            if (error) {
              printFailure(error);
            } else {
              config.logger.log(colors.green("Completed without errors on " + new Date().toString()));
            }
            working = false;
          });
        }
      } else if (needsRecompile) {
        needsRecompile = false;
        working = true;

        Contracts.compile(config, function(error) {
          if (error) {
            printFailure(error);
          }
          working = false;
        });
      }

      setTimeout(checkIfBuildOrCompileNecessary, 200);
    };

    checkIfBuildOrCompileNecessary();
  }
}

const printFailure = (error) => {
  if (error instanceof TruffleError) {
    console.log(error.message);
  } else {
    // Bubble up all other unexpected errors.
    console.log(error.stack || error.toString());
  }
};

module.exports = command;
