/*
 * returns a VCS url string given:
 * - a VCS url string
 * - a github `org/repo` string
 * - a string containing a repo under the `truffle-box` org
 */
function normalizeURL(
  url = "https://github.com:trufflesuite/truffle-init-default"
) {
  // remove the .git from the repo specifier
  if (url.includes(".git")) {
    url = url.replace(/.git$/, "");
    url = url.replace(/.git#/, "#");
    url = url.replace(/.git:/, ":");
  }

  // rewrite https://github.com/truffle-box/metacoin format in
  //         https://github.com:truffle-box/metacoin format
  if (url.match(/.com\//)) {
    url = url.replace(/.com\//, ".com:");
  }

  // full URL already
  if (url.includes("://")) {
    return url;
  }

  if (url.includes("git@")) {
    return url.replace("git@", "https://");
  }

  if (url.split("/").length === 2) {
    // `org/repo`
    return `https://github.com:${url}`;
  }

  if (!url.includes("/")) {
    // repo name only
    if (!url.includes("-box")) {
      // check for branch
      if (!url.includes("#")) {
        url = `${url}-box`;
      } else {
        const index = url.indexOf("#");
        url = `${url.substr(0, index)}-box${url.substr(index)}`;
      }
    }
    return `https://github.com:truffle-box/${url}`;
  }
  throw new Error("Box specified in invalid format");
}

function normalizeDestination(destination, workingDirectory) {
  if (!destination) {
    return workingDirectory;
  }
  const path = require("path");
  if (path.isAbsolute(destination)) return destination;
  return path.join(workingDirectory, destination);
}

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

    url = normalizeURL(url);

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
