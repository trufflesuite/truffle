const normalizeDestination = (destination, workingDirectory) => {
  if (!destination) {
    return workingDirectory;
  }
  const path = require("path");
  if (path.isAbsolute(destination)) return destination;
  return path.join(workingDirectory, destination);
};

const command = {
  command: "unbox",
  description: "Download a Truffle Box, a pre-built Truffle project",
  builder: {},
  help: {
    usage: "truffle unbox [destination] [<box_name>] [--force]",
    options: [
      {
        option: "destination",
        description:
          "Path to the directory in which you would like " +
          "to unbox the project files. If destination is\n                  " +
          "  not provided, this defaults to the current directory.",
      },
      {
        option: "<box_name>",
        description:
          "Name of the truffle box. If no box_name is specified, a default " +
          "truffle box will be downloaded.",
      },
      {
        option: "--force",
        description:
          "Unbox project in the current directory regardless of its " +
          "state. Be careful, this\n                    will potentially overwrite files " +
          "that exist in the directory.",
      },
    ],
  },
  run(options, done) {
    const Config = require("@truffle/config");
    const Box = require("@truffle/box");
    const fse = require("fs-extra");

    const config = Config.default().with({ logger: console });

    let [url, destination] = options._;

    const normalizedDestination = normalizeDestination(
      destination,
      config.working_directory
    );

    fse.ensureDirSync(normalizedDestination);

    const unboxOptions = Object.assign({}, options, { logger: config.logger });

    config.events.emit("unbox:start");

    Box.unbox(url, normalizedDestination, unboxOptions, config)
      .then(async (boxConfig) => {
        await config.events.emit("unbox:succeed", { boxConfig });
        done();
      })
      .catch(done);
  },
};

module.exports = command;
