const fse = require("fs-extra");
const del = require("del");
const WorkflowCompile = require("@truffle/workflow-compile");
const BuildError = require("./errors/builderror");
const { spawn } = require("child_process");
const spawnargs = require("spawn-args");
const _ = require("lodash");
const expect = require("@truffle/expect");

function CommandBuilder(command) {
  this.command = command;
}

CommandBuilder.prototype.build = function (options, callback) {
  console.log("Running `" + this.command + "`...");

  const args = spawnargs(this.command);
  const ps = args.shift();

  const cmd = spawn(ps, args, {
    detached: false,
    cwd: options.working_directory,
    env: _.merge(process.env, {
      WORKING_DIRECTORY: options.working_directory,
      BUILD_DESTINATION_DIRECTORY: options.destination_directory,
      BUILD_CONTRACTS_DIRECTORY: options.contracts_build_directory
    })
  });

  cmd.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  cmd.stderr.on("data", function (data) {
    console.error(data);
  });

  cmd.on("close", function (code) {
    let error = null;
    if (code !== 0) {
      error = "Command exited with code " + code;
    }
    callback(error);
  });
};

const Build = {
  clean: async function (options) {
    const destination = options.build_directory;
    const contracts_build_directory = options.contracts_build_directory;

    // Clean first.
    await del([destination + "/*", "!" + contracts_build_directory]);
    fse.ensureDirSync(destination);
  },

  build: async function (options) {
    expect.options(options, [
      "build_directory",
      "working_directory",
      "contracts_build_directory",
      "networks"
    ]);

    const logger = options.logger || console;
    let builder = options.build;

    // Duplicate build directory for legacy purposes
    options.destination_directory = options.build_directory;

    if (builder === null || typeof builder === "undefined") {
      logger.log(
        "No build configuration found. Preparing to compile contracts."
      );
    } else if (typeof builder === "string") {
      builder = new CommandBuilder(builder);
    } else if (typeof builder === "function") {
      // If they've only provided a build function, use that.
      builder = { build: builder };
    } else if (builder.build == null) {
      throw new BuildError(
        "Build configuration can no longer be specified as an object. Please see our documentation for an updated list of supported build configurations."
      );
    }

    // Use our own clean method unless the builder supplies one.
    let clean = this.clean;
    if (builder && builder.hasOwnProperty("clean")) {
      clean = builder.clean;
    }

    await clean(options);

    // If necessary. This prevents errors due to the .sol.js files not existing.
    await WorkflowCompile.compileAndSave(options);
    if (builder) {
      builder.build(options, function (err) {
        if (err) {
          if (typeof err === "string") {
            throw new BuildError(err);
          }
          if (err.message) {
            throw new BuildError(err.message, { cause: err });
          }

          throw new BuildError(`Unknown error: ${err.toString()}`, {
            cause: err
          });
        }
      });
    }
  }
};

module.exports = Build;
