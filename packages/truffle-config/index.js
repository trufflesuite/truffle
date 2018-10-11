var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var Provider = require("truffle-provider");
var TruffleError = require("truffle-error");
var Module = require('module');
var findUp = require("find-up");
var originalrequire = require("original-require");
const Configstore = require('configstore');

var DEFAULT_CONFIG_FILENAME = "truffle.js";
var BACKUP_CONFIG_FILENAME = "truffle-config.js"; // For Windows + Command Prompt
const DEFAULT_USER_CONFIG = "truffle";

function Config(truffle_directory, working_directory, network) {
  var self = this;

  var default_tx_values = {
    gas: 6721975,
    gasPrice: 20000000000, // 20 gwei,
    from: null,
  };

  const defaultUserConfig = new Configstore(DEFAULT_USER_CONFIG, {}, { globalConfigPath: true });

  // This is a list of multi-level keys with defaults
  // we need to _.merge. Using this list for safety
  // vs. just merging all objects.
  this._deepCopy = ['compilers'];

  this._values = {
    truffle_directory: truffle_directory || path.resolve(path.join(__dirname, "../")),
    working_directory: working_directory || process.cwd(),
    network: network,
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
          },
          evmVersion: "byzantium"
        }
      },
      vyper: {}
    },
    logger: {
      log: function() {},
    }
  };

  const resolveDirectory = (value) =>
    path.resolve(self.working_directory, value);

  var props = {
    // These are already set.
    truffle_directory: function() {},
    working_directory: function() {},
    network: function() {},
    networks: function() {},
    verboseRpc: function() {},
    build: function() {},
    resolver: function() {},
    artifactor: function() {},
    ethpm: function() {},
    logger: function() {},
    compilers: function() {},

    build_directory: {
      default: () => path.join(self.working_directory, "build"),
      transform: resolveDirectory
    },
    contracts_directory: {
      default: () => path.join(self.working_directory, "contracts"),
      transform: resolveDirectory
    },
    contracts_build_directory: {
      default: () => path.join(self.build_directory, "contracts"),
      transform: resolveDirectory
    },
    migrations_directory: {
      default: () => path.join(self.working_directory, "migrations"),
      transform: resolveDirectory
    },
    test_directory: {
      default: () => path.join(self.working_directory, "test"),
      transform: resolveDirectory
    },
    test_file_extension_regexp: function() {
      return /.*\.(js|es|es6|jsx|sol)$/
    },
    example_project_directory: {
      default: () => path.join(self.truffle_directory, "example"),
      transform: resolveDirectory
    },
    network_id: {
      get: function() {
        try {
          return self.network_config.network_id;
        } catch (e) {
          return null;
        }
      },
      set: function(val) {
        throw new Error("Do not set config.network_id. Instead, set config.networks and then config.networks[<network name>].network_id");
      }
    },
    network_config: {
      get: function() {
        var network = self.network;

        if (network == null) {
          throw new Error("Network not set. Cannot determine network to use.");
        }

        var conf = self.networks[network];

        if (conf == null) {
          config = {};
        }

        conf = _.extend({}, default_tx_values, conf);

        return conf;
      },
      set: function(val) {
        throw new Error("Don't set config.network_config. Instead, set config.networks with the desired values.");
      }
    },
    from: {
      get: function() {
        try {
          return self.network_config.from;
        } catch (e) {
          return default_tx_values.from;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.from directly. Instead, set config.networks and then config.networks[<network name>].from")
      }
    },
    gas: {
      get: function() {
        try {
          return self.network_config.gas;
        } catch (e) {
          return default_tx_values.gas;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.gas directly. Instead, set config.networks and then config.networks[<network name>].gas")
      }
    },
    gasPrice: {
      get: function() {
        try {
          return self.network_config.gasPrice;
        } catch (e) {
          return default_tx_values.gasPrice;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.gasPrice directly. Instead, set config.networks and then config.networks[<network name>].gasPrice")
      }
    },
    provider: {
      get: function() {
        if (!self.network) {
          return null;
        }

        var options = self.network_config;
        options.verboseRpc = self.verboseRpc;
        return Provider.create(options);
      },
      set: function(val) {
        throw new Error("Don't set config.provider directly. Instead, set config.networks and then set config.networks[<network name>].provider")
      }
    },
    confirmations: {
      get: function() {
        try {
          return self.network_config.confirmations;
        } catch (e) {
          return 0;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.confirmations directly. Instead, set config.networks and then config.networks[<network name>].confirmations")
      }
    },
    production: {
      get: function() {
        try {
          return self.network_config.production;
        } catch (e) {
          return false;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.production directly. Instead, set config.networks and then config.networks[<network name>].production")
      }
    },
    timeoutBlocks: {
      get: function(){
        try {
          return self.network_config.timeoutBlocks;
        } catch (e) {
          return 0;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.timeoutBlocks directly. Instead, set config.networks and then config.networks[<network name>].timeoutBlocks")
      }
    },
    skipDryRun: {
      get: function(){
        try {
          return self.network_config.skipDryRun;
        } catch (e) {
          return false;
        }
      },
      set: function(val) {
        throw new Error("Don't set config.skipDryRun directly. Instead, set config.networks and then config.networks[<network name>].skipDryRun")
      }
    }

  };

  Object.keys(props).forEach(function(prop) {
    self.addProp(prop, props[prop]);
  });
};

Config.prototype.addProp = function(propertyName, descriptor) {
  // possible property descriptors
  //
  // supports `default` and `transform` in addition to `get` and `set`
  //
  // default: specify function to retrieve default value (used by get)
  // transform: specify function to transform value when (used by set)
  Object.defineProperty(this, propertyName, {
    // retrieve config property value
    get: descriptor.get || function() {
      // value is specified
      if (propertyName in this._values) {
        return this._values[propertyName];
      }

      // default getter is specified
      if (descriptor.default) {
        return descriptor.default()
      };

      // descriptor is a function
      return descriptor();
    },
    set: descriptor.set || function(value) {
      this._values[propertyName] = (descriptor.transform)
        ? descriptor.transform(value)
        : value;
    },
    configurable: true,
    enumerable: true
  });
};

Config.prototype.normalize = function(obj) {
  var clone = {};
  Object.keys(obj).forEach(function(key) {
    try {
      clone[key] = obj[key];
    } catch (e) {
      // Do nothing with values that throw.
    }
  });
  return clone;
}

Config.prototype.with = function(obj) {
  var normalized = this.normalize(obj);
  var current = this.normalize(this);

  return _.extend({}, current, normalized);
};

Config.prototype.merge = function(obj) {
  var self = this;
  var clone = this.normalize(obj);

  // Only set keys for values that don't throw.
  Object.keys(obj).forEach(function(key) {
    try {
      if (typeof clone[key] === 'object' && self._deepCopy.includes(key)){
        self[key] = _.merge(self[key], clone[key])
      } else {
        self[key] = clone[key];
      }
    } catch (e) {
      // Do nothing.
    }
  });

  return this;
};

Config.default = function() {
  return new Config();
};

Config.detect = function(options, filename) {
  var search;

  (!filename)
    ? search = [DEFAULT_CONFIG_FILENAME, BACKUP_CONFIG_FILENAME]
    : search = filename;

  var file = findUp.sync(search, {cwd: options.working_directory || options.workingDirectory});

  if (file == null) {
    throw new TruffleError("Could not find suitable configuration file.");
  }

  return this.load(file, options);
};

Config.load = function(file, options) {
  var config = new Config();

  config.working_directory = path.dirname(path.resolve(file));

  // The require-nocache module used to do this for us, but
  // it doesn't bundle very well. So we've pulled it out ourselves.
  delete require.cache[Module._resolveFilename(file, module)];
  var static_config = originalrequire(file);

  config.merge(static_config);
  config.merge(options);

  return config;
};

Config.getUserConfig = function() {
  return new Configstore('truffle', {}, { globalConfigPath: true });
}

module.exports = Config;
