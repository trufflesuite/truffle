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

/*
 * returns a list of messages, one for each command, formatted
 * so that:
 *
 *    command key:   command string
 *
 * are aligned
 */
function formatCommands(commands) {
  const names = Object.keys(commands);

  const maxLength = Math.max.apply(null, names.map(({ length }) => length));

  return names.map(name => {
    const spacing = Array(maxLength - name.length + 1).join(" ");
    return `  ${name}: ${spacing}${commands[name]}`;
  });
}

function normalizeDestination(destination, working_directory) {
  const path = require("path");
  if (path.isAbsolute(destination)) return destination;
  return path.join(working_directory, destination);
}

function normalizeInput([url, subDir]) {
  // The subDir argument will override paths in the url
  let destination = subDir ? subDir : "";
  let parsedUrl;
  try {
    // attempts to parse url from :path/to/subDir
    parsedUrl = url.match(/(.*):/)[1];
    // handles instance where full url is being passed w/o a path in url
    if (parsedUrl.includes("http") && !parsedUrl.includes("//")) {
      return { url, destination };
    }
    // handles instance where git@ is being passed w/o a path in url
    if (parsedUrl.includes("git") && !parsedUrl.includes("/")) {
      return { url, destination };
    }
  } catch (_) {
    // return url if regex fails (no path specified in url)
    return { url, destination };
  }

  if (destination !== "") return { url, destination };

  try {
    // if a path was specified in the url
    destination = url.match(/:(?!\/)(.*)/)[1]; // enforces relative paths
    // parses again if passed url git@ with path
    if (parsedUrl.includes("git@"))
      destination = destination.match(/:(?!\/)(.*)/)[1];
  } catch (_) {
    throw new Error(
      `${url} not allowed! Please use a relative path (:path/to/subDir)`
    );
  }
  // returns the parsed url & relative path
  return { url: parsedUrl, destination };
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
    const OS = require("os");
    const fse = require("fs-extra");

    const config = Config.default().with({ logger: console });

    ({ url, destination } = normalizeInput(options._));
    url = normalizeURL(url);

    const normalizedDestination = normalizeDestination(
      destination,
      config.working_directory
    );

    fse.ensureDirSync(normalizedDestination);

    const unboxOptions = Object.assign({}, options, { logger: config.logger });

    Box.unbox(url, normalizedDestination, unboxOptions)
      .then(({ commands }) => {
        config.logger.log(`\nUnbox successful. Sweet!${OS.EOL}`);

        const commandMessages = formatCommands(commands);
        if (commandMessages.length > 0) config.logger.log(`Commands:${OS.EOL}`);

        commandMessages.forEach(message => config.logger.log(message));
        config.logger.log("");

        done();
      })
      .catch(done);
  }
};

module.exports = command;
