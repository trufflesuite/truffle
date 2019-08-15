const command = {
  command: "config",
  description: "Set user-level configuration options",
  help: {
    usage:
      "truffle config <enable|disable|get|read|set|write> <key> [<value-for-set>]",
    options: [
      {
        option: "--enable-analytics",
        description: "Enable Truffle to send usage data to Google Analytics"
      },
      {
        option: "--disable-analytics",
        description:
          "Disable Truffle's ability to send usage data to Google Analytics"
      },
      {
        option: "enable",
        discription: "Enable a Truffle Attribute"
      },
      {
        option: "disable",
        discription: "Disable a Truffle Attribute"
      },
      {
        option: "get",
        discription: "Get a Truffle Attribute"
      },
      {
        option: "read",
        discription: "Get a Truffle Attribute"
      },
      {
        option: "set",
        discription: "Set a Truffle Attribute"
      },
      {
        option: "write",
        discription: "Set a Truffle Attribute"
      }
    ]
  },
  userLevelSettings: ["analytics"],
  builder: {
    _: {
      type: "string"
    }
  },
  /**
   * run config commands to get/set project/user-level config settings
   * @param {Object} options
   * @param {Func} callback
   */
  run: function(options, done) {
    const googleAnalytics = require("../services/analytics/google.js");
    const Config = require("truffle-config");

    let command;
    if (options.enableAnalytics || options.disableAnalytics) {
      // TODO: Deprecate the --(en|dis)able-analytics flag in favor for `enable analytics`
      command = {
        set: true,
        userLevel: true,
        key: "analytics",
        value: options.enableAnalytics || false
      };
    } else {
      command = parse(options._);
    }

    if (command === null) {
      const setAnalytics = googleAnalytics.setUserConfigViaPrompt();
      setAnalytics.then(() => done()).catch(err => err);
    } else if (command.userLevel) {
      switch (command.key) {
        case "analytics": {
          if (command.set) {
            googleAnalytics.setAnalytics(command.value);
          } else {
            options.logger.log(googleAnalytics.getAnalytics());
          }
          break;
        }
      }

      done();
    } else {
      Promise.resolve()
        .then(() => {
          const config = Config.detect(options);

          if (command.set) {
            options.logger.log(
              "Setting project-level parameters is not supported yet."
            );
            // TODO: add support for writing project-level settings to the truffle config file
            // config[command.key] = command.value;
          } else {
            options.logger.log(config[command.key]);
          }
        })
        .then(done)
        .catch(options.logger.log);
    }
  }
};

const parse = function(args) {
  if (args.length === 0) {
    return null;
  }

  let option = args[0];

  if (typeof option !== "string") {
    // invalid option
    throw new Error(`Invalid config option "${option}"`);
  }
  option = option.toLowerCase();

  let set = false;
  let key = args[1];
  let value = args[2];

  switch (option) {
    case "enable": {
      set = true;
      value = true;
      break;
    }
    case "disable": {
      set = true;
      value = false;
      break;
    }
    case "get":
    case "read": {
      set = false;
      if (typeof key === "undefined" || key === null || key === "") {
        // invalid key
        throw new Error("Must provide a <key>");
      }

      break;
    }
    case "set":
    case "write": {
      set = true;
      if (typeof key === "undefined" || key === null || key === "") {
        // invalid key
        throw new Error("Must provide a <key>");
      }

      if (typeof value !== "string" || value === "") {
        // invalid value
        throw new Error("Must provide a <value-for-set>");
      }

      switch (value.toLowerCase()) {
        case "null": {
          value = null;
          break;
        }
        case "undefined": {
          value = undefined;
          break;
        }
        case "true": {
          value = true;
          break;
        }
        case "false": {
          value = false;
          break;
        }
        default: {
          // check if number, otherwise leave as string
          const float = parseFloat(value);
          if (!isNaN(float) && value === float.toString()) {
            value = float;
          }
          break;
        }
      }

      break;
    }
    default: {
      if (
        option !== "--enable-analytics" &&
        option !== "--disable-analytics" &&
        option !== ""
      ) {
        // TODO: Deprecate the --(en|dis)able-analytics flag in favor for `enable analytics`
        // invalid command!
        throw new Error(`Invalid config option "${option}"`);
      } else {
        // we should not have gotten here
        return null;
      }
    }
  }

  return {
    set,
    userLevel: command.userLevelSettings.includes(key),
    key,
    value
  };
};

module.exports = command;
