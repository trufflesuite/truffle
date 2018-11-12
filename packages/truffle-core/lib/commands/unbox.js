/*
 * returns a VCS url string given:
 * - a VCS url string
 * - a github `org/repo` string
 * - a string containing a repo under the `truffle-box` org
 */
function normalizeURL(url) {
  url = url || "https://github.com/trufflesuite/truffle-init-default";

  // full URL already
  if (url.indexOf("://") != -1 || url.indexOf("git@") != -1) {
    return url;
  }

  if (url.split("/").length == 2) {
    // `org/repo`
    return "https://github.com/" + url;
  }

  if (url.indexOf("/") == -1) {
    // repo name only
    if (url.indexOf("-box") == -1) {
      url = url + "-box";
    }
    return "https://github.com/truffle-box/" + url;
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
  var names = Object.keys(commands);

  var maxLength = Math.max.apply(
    null,
    names.map(function(name) {
      return name.length;
    })
  );

  return names.map(function(name) {
    var spacing = Array(maxLength - name.length + 1).join(" ");
    return "  " + name + ": " + spacing + commands[name];
  });
}

var command = {
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
  run: function(options, done) {
    const Config = require("truffle-config");
    const Box = require("truffle-box");
    const OS = require("os");

    const config = Config.default().with({
      logger: console
    });

    const url = normalizeURL(options._[0]);

    const unboxOptions = Object.assign({}, options, { logger: config.logger });

    Box.unbox(url, config.working_directory, unboxOptions)
      .then(boxConfig => {
        config.logger.log("Unbox successful. Sweet!" + OS.EOL);

        var commandMessages = formatCommands(boxConfig.commands);
        if (commandMessages.length > 0) {
          config.logger.log("Commands:" + OS.EOL);
        }
        commandMessages.forEach(function(message) {
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
