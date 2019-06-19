const command = {
  command: "exec",
  description: "Execute a JS module within this Truffle environment",
  builder: {
    file: {
      type: "string"
    },
    c: {
      type: "boolean",
      default: false
    },
    compile: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle exec <script.js> [--network <name>]",
    options: [
      {
        option: "<script.js>",
        description:
          "JavaScript file to be executed. Can include path information if the script" +
          " does not exist in the current\n                    directory. (required)"
      },
      {
        option: "--network <name>",
        description:
          "Specify the network to use, using artifacts specific to that network." +
          " Network name must exist in the\n                    configuration."
      },
      {
        option: "--compile",
        description: "Compile contracts before executing the script."
      }
    ]
  },
  run: function(options, done) {
    const Config = require("truffle-config");
    const Contracts = require("truffle-workflow-compile");
    const ConfigurationError = require("../errors/configurationerror");
    const Require = require("truffle-require");
    const { Environment } = require("truffle-environment");
    const path = require("path");
    const OS = require("os");

    const config = Config.detect(options);

    let file = options.file;

    if (file == null && options._.length > 0) {
      file = options._[0];
    }

    if (file == null) {
      done(
        new ConfigurationError(
          "Please specify a file, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished."
        )
      );
      return;
    }

    if (path.isAbsolute(file) === false) {
      file = path.join(process.cwd(), file);
    }

    Environment.detect(config)
      .then(() => {
        if (config.networkHint !== false) {
          config.logger.log("Using network '" + config.network + "'." + OS.EOL);
        }

        // `--compile`
        if (options.c || options.compile) {
          return Contracts.compile(config, function(err) {
            if (err) return done(err);

            Require.exec(
              config.with({
                file: file
              }),
              done
            );
          });
        }

        // Just exec
        Require.exec(
          config.with({
            file: file
          }),
          done
        );
      })
      .catch(error => {
        done(error);
      });
  }
};

module.exports = command;
