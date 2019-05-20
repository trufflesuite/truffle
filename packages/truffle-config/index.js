const _ = require("lodash");
const path = require("path");
const Provider = require("truffle-provider");
const TruffleError = require("truffle-error");
const Module = require("module");
const findUp = require("find-up");
const originalrequire = require("original-require");
const Configstore = require("configstore");

const DEFAULT_CONFIG_FILENAME = "truffle-config.js";
const BACKUP_CONFIG_FILENAME = "truffle.js"; // old config filename

class Config {
  constructor(truffle_directory, working_directory, network) {
    const default_tx_values = {
      gas: 6721975,
      gasPrice: 20000000000, // 20 gwei,
      from: null
    };

    // This is a list of multi-level keys with defaults
    // we need to _.merge. Using this list for safety
    // vs. just merging all objects.
    this._deepCopy = ["compilers"];

    this._values = {
      truffle_directory:
        truffle_directory || path.resolve(path.join(__dirname, "../")),
      working_directory: working_directory || process.cwd(),
      network,
      networks: {},
      verboseRpc: false,
      gas: null,
      gasPrice: null,
      from: null,
      confirmations: 0,
      timeoutBlocks: 0,
      production: false,
      skipDryRun: false,
      build: null,
      resolver: null,
      artifactor: null,
      ethpm: {
        ipfs_host: "ipfs.infura.io",
        ipfs_protocol: "https",
        registry: "0x8011df4830b4f696cd81393997e5371b93338878",
        install_provider_uri: "https://ropsten.infura.io/truffle"
      },
      compilers: {
        solc: {
          settings: {
            optimizer: {
              enabled: false,
              runs: 200
            }
          }
        },
        vyper: {}
      },
      logger: {
        log() {}
      }
    };

    const resolveDirectory = value =>
      path.resolve(this.working_directory, value);

    const props = {
      // These are already set.
      truffle_directory() {},
      working_directory() {},
      network() {},
      networks() {},
      verboseRpc() {},
      build() {},
      resolver() {},
      artifactor() {},
      ethpm() {},
      logger() {},
      compilers() {},

      build_directory: {
        default: () => path.join(this.working_directory, "build"),
        transform: resolveDirectory
      },
      contracts_directory: {
        default: () => path.join(this.working_directory, "contracts"),
        transform: resolveDirectory
      },
      contracts_build_directory: {
        default: () => path.join(this.build_directory, "contracts"),
        transform: resolveDirectory
      },
      migrations_directory: {
        default: () => path.join(this.working_directory, "migrations"),
        transform: resolveDirectory
      },
      migrations_file_extension_regexp() {
        return /^\.(js|es6?)$/;
      },
      test_directory: {
        default: () => path.join(this.working_directory, "test"),
        transform: resolveDirectory
      },
      test_file_extension_regexp() {
        return /.*\.(js|ts|es|es6|jsx|sol)$/;
      },
      example_project_directory: {
        default: () => path.join(this.truffle_directory, "example"),
        transform: resolveDirectory
      },
      network_id: {
        get() {
          try {
            return this.network_config.network_id;
          } catch (e) {
            return null;
          }
        },
        set() {
          throw new Error(
            "Do not set config.network_id. Instead, set config.networks and then config.networks[<network name>].network_id"
          );
        }
      },
      network_config: {
        get() {
          const network = this.network;

          if (network === null || network === undefined) {
            throw new Error(
              "Network not set. Cannot determine network to use."
            );
          }

          let conf = this.networks[network];

          if (conf === null || conf === undefined) {
            config = {};
          }

          conf = _.extend({}, default_tx_values, conf);

          return conf;
        },
        set() {
          throw new Error(
            "Don't set config.network_config. Instead, set config.networks with the desired values."
          );
        }
      },
      from: {
        get() {
          try {
            return this.network_config.from;
          } catch (e) {
            return default_tx_values.from;
          }
        },
        set() {
          throw new Error(
            "Don't set config.from directly. Instead, set config.networks and then config.networks[<network name>].from"
          );
        }
      },
      gas: {
        get() {
          try {
            return this.network_config.gas;
          } catch (e) {
            return default_tx_values.gas;
          }
        },
        set() {
          throw new Error(
            "Don't set config.gas directly. Instead, set config.networks and then config.networks[<network name>].gas"
          );
        }
      },
      gasPrice: {
        get() {
          try {
            return this.network_config.gasPrice;
          } catch (e) {
            return default_tx_values.gasPrice;
          }
        },
        set() {
          throw new Error(
            "Don't set config.gasPrice directly. Instead, set config.networks and then config.networks[<network name>].gasPrice"
          );
        }
      },
      provider: {
        get() {
          if (!this.network) {
            return null;
          }

          const options = this.network_config;
          options.verboseRpc = this.verboseRpc;

          return Provider.create(options);
        },
        set() {
          throw new Error(
            "Don't set config.provider directly. Instead, set config.networks and then set config.networks[<network name>].provider"
          );
        }
      },
      confirmations: {
        get() {
          try {
            return this.network_config.confirmations;
          } catch (e) {
            return 0;
          }
        },
        set() {
          throw new Error(
            "Don't set config.confirmations directly. Instead, set config.networks and then config.networks[<network name>].confirmations"
          );
        }
      },
      production: {
        get() {
          try {
            return this.network_config.production;
          } catch (e) {
            return false;
          }
        },
        set() {
          throw new Error(
            "Don't set config.production directly. Instead, set config.networks and then config.networks[<network name>].production"
          );
        }
      },
      timeoutBlocks: {
        get() {
          try {
            return this.network_config.timeoutBlocks;
          } catch (e) {
            return 0;
          }
        },
        set() {
          throw new Error(
            "Don't set config.timeoutBlocks directly. Instead, set config.networks and then config.networks[<network name>].timeoutBlocks"
          );
        }
      }
    };

    Object.keys(props).forEach(prop => {
      this.addProp(prop, props[prop]);
    });
  }

  addProp(propertyName, descriptor) {
    // possible property descriptors
    //
    // supports `default` and `transform` in addition to `get` and `set`
    //
    // default: specify function to retrieve default value (used by get)
    // transform: specify function to transform value when (used by set)
    Object.defineProperty(this, propertyName, {
      // retrieve config property value
      get:
        descriptor.get ||
        function() {
          // value is specified
          if (propertyName in this._values) {
            return this._values[propertyName];
          }

          // default getter is specified
          if (descriptor.default) {
            return descriptor.default();
          }

          // descriptor is a function
          return descriptor();
        },
      set:
        descriptor.set ||
        function(value) {
          this._values[propertyName] = descriptor.transform
            ? descriptor.transform(value)
            : value;
        },
      configurable: true,
      enumerable: true
    });
  }

  normalize(obj) {
    const clone = {};
    Object.keys(obj).forEach(key => {
      try {
        clone[key] = obj[key];
      } catch (e) {
        // Do nothing with values that throw.
      }
    });
    return clone;
  }

  with(obj) {
    const normalized = this.normalize(obj);
    const current = this.normalize(this);

    return _.extend({}, current, normalized);
  }

  merge(obj) {
    let clone = this.normalize(obj);

    // Only set keys for values that don't throw.
    const propertyNames = Object.keys(obj);

    propertyNames.forEach(key => {
      try {
        if (typeof clone[key] === "object" && this._deepCopy.includes(key)) {
          this[key] = _.merge(this[key], clone[key]);
        } else {
          this[key] = clone[key];
        }
      } catch (e) {
        // Do nothing.
      }
    });

    return this;
  }
}

Config.default = () => new Config();

Config.search = (options = {}, filename) => {
  const searchOptions = {
    cwd: options.working_directory || options.workingDirectory
  };

  if (!filename) {
    const isWin = /^win/.test(process.platform);
    const defaultConfig = findUp.sync(DEFAULT_CONFIG_FILENAME, searchOptions);
    const backupConfig = findUp.sync(BACKUP_CONFIG_FILENAME, searchOptions);
    if (defaultConfig && backupConfig) {
      console.warn(
        `Warning: Both ${DEFAULT_CONFIG_FILENAME} and ${BACKUP_CONFIG_FILENAME} were found. Using ${DEFAULT_CONFIG_FILENAME}.`
      );
      return defaultConfig;
    } else if (backupConfig && !defaultConfig) {
      if (isWin)
        console.warn(
          `Warning: Please rename ${BACKUP_CONFIG_FILENAME} to ${DEFAULT_CONFIG_FILENAME} to ensure Windows compatibility.`
        );
      return backupConfig;
    } else {
      return defaultConfig;
    }
  }

  return findUp.sync(filename, searchOptions);
};

Config.detect = (options = {}, filename) => {
  const configFile = Config.search(options, filename);

  if (!configFile) {
    throw new TruffleError("Could not find suitable configuration file.");
  }

  return Config.load(configFile, options);
};

Config.load = (file, options) => {
  const config = new Config();

  config.working_directory = path.dirname(path.resolve(file));

  // The require-nocache module used to do this for us, but
  // it doesn't bundle very well. So we've pulled it out ourselves.
  delete require.cache[Module._resolveFilename(file, module)];
  const static_config = originalrequire(file);

  config.merge(static_config);
  config.merge(options);

  return config;
};

Config.getUserConfig = () =>
  new Configstore("truffle", {}, { globalConfigPath: true });

Config.getTruffleDataDirectory = () => {
  const configStore = new Configstore(
    "truffle",
    {},
    { globalConfigPath: true }
  );
  return path.dirname(configStore.path);
};

module.exports = Config;
