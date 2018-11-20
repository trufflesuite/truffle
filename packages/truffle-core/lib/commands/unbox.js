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
    url = url;
  }

  if (url.split("/").length === 2) {
    // `org/repo`
    return `https://github.com/${url}`;
  }

  if (!url.includes("/")) {
    // repo name only
    if (!url.includes("-box")) {
      url = `${url}-box`;
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

  const maxLength = Math.max.apply(null, names.map(name => name.length));

  return names.map(name => {
    const spacing = Array(maxLength - name.length + 1).join(" ");
    return `  ${name}: ${spacing}${commands[name]}`;
  });
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
  } catch (_) {
    return [url, ""];
  }
  try {
    subDir = options.match(/:(?!\/)(.*)/)[1]; // enforces relative paths
  } catch (_) {
    throw new Error(
      `${options} not allowed! Please use a relative path (:path/to/subDir)`
    );
  }

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
    const Config = require("truffle-config");
    const Box = require("truffle-box");
    const OS = require("os");

    const config = Config.default().with({
      logger: console
    });

    let [url, destination] = normalizeInput(options._[0]);

    url = normalizeURL(url);
    destination = normalizeDestination(destination, config.working_directory);

    const unboxOptions = Object.assign({}, options, { logger: config.logger });

    Box.unbox(url, destination, unboxOptions)
      .then(boxConfig => {
        config.logger.log(`Unbox successful. Sweet!${OS.EOL}`);

        const commandMessages = formatCommands(boxConfig.commands);
        if (commandMessages.length > 0) {
          config.logger.log(`Commands:${OS.EOL}`);
        }
        commandMessages.forEach(message => {
          config.logger.log(message);
        });

        if (boxConfig.epilogue) {
          config.logger.log(boxConfig.epilogue.replace("\n", OS.EOL));
        }

        done();
      })
      .catch(done);
  }
};

module.exports = command;
