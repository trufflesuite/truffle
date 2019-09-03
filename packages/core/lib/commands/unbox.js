/*
 * returns a VCS url string given:
 * - a VCS url string
 * - a github `org/repo` string
 * - a string containing a repo under the `truffle-box` org
 */
function normalizeURL(
  url = "https://github.com/trufflesuite/truffle-init-default"
) {
  // full URL already
  if (url.includes("://") || url.includes("git@")) {
    return url;
  }

  if (url.split("/").length === 2) {
    // `org/repo`
    return `https://github.com/${url}`;
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
    return `https://github.com/truffle-box/${url}`;
  }
  throw new Error("Box specified in invalid format");
}

function normalizeDestination(destination, working_directory) {
  const path = require("path");
  destination = path.join(working_directory, destination);
  return destination;
}

function normalizeInput(options) {
  let url = options;
  let subDir;

  try {
    url = options.match(/(.*):/)[1]; // attempts to parse url from :path/to/subDir
    // handles instance where full url is being passed w/o a path
    if (url.includes("http") && !url.includes("//")) return [options, ""];
    // handles instance where git@ is being passed w/o a path
    if (url.includes("git") && !url.includes("/")) return [options, ""];
  } catch (_) {
    // return url if regex fails (no path specified)
    return [url, ""];
  }

  try {
    // if a path was specified
    subDir = options.match(/:(?!\/)(.*)/)[1]; // enforces relative paths
    // parses again if passed url git@ with path
    if (url.includes("git@")) subDir = subDir.match(/:(?!\/)(.*)/)[1];
  } catch (_) {
    throw new Error(
      `${options} not allowed! Please use a relative path (:path/to/subDir)`
    );
  }
  // returns the parsed url & relative path
  return [url, subDir];
}

const command = {
  command: "unbox",
  description: "Download a Truffle Box, a pre-built Truffle project",
  builder: {},
  help: {
    usage: "truffle unbox [<box_name>] [--force]",
    options: [
      {
        option: "<box_name>",
        description:
          "Name of the truffle box. If no box_name is specified, a default " +
          "truffle box will be downloaded."
      },
      {
        option: "--force",
        description:
          "Unbox project in the current directory regardless of its " +
          "state. Be careful, this\n                    will potentially overwrite files " +
          "that exist in the directory."
      }
    ]
  },
  run(options, done) {
    const Config = require("@truffle/config");
    const Box = require("@truffle/box");

    const config = Config.default().with({
      logger: console
    });

    let [url, destination] = normalizeInput(options._[0]);

    url = normalizeURL(url);
    destination = normalizeDestination(destination, config.working_directory);

    const unboxOptions = Object.assign({}, options, { logger: config.logger });

    config.events.emit("unbox:start");

    Box.unbox(url, destination, unboxOptions, config)
      .then(async boxConfig => {
        await config.events.emit("unbox:succeed", { boxConfig });
        done();
      })
      .catch(done);
  }
};

module.exports = command;
