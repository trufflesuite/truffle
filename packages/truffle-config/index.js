var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var Provider = require("truffle-provider");
var TruffleError = require("truffle-error");
var requireNoCache = require("require-nocache")(module);
var findUp = require("find-up");

var DEFAULT_CONFIG_FILENAME = "truffle.js";
var BACKUP_CONFIG_FILENAME = "truffle-config.js"; // For Windows + Command Prompt

function Config(truffle_directory, working_directory, network) {
  var self = this;

  var default_tx_values = {
    gas: 4712388,
    gasPrice: 100000000000, // 100 Shannon,
    from: null
  };

  this._values = {
    truffle_directory: truffle_directory || path.resolve(path.join(__dirname, "../")),
    working_directory: working_directory || process.cwd(),
    network: network,
    networks: {},
    verboseRpc: false,
    gas: null,
    gasPrice: null,
    from: null,
    build: null,
    resolver: null,
    artifactor: null,
    ethpm: {
      ipfs_host: "ipfs.infura.io",
      ipfs_protocol: "https",
      registry: "0xbab799ff7d9e13a50696a8bebb7a1b77ae519586",
      install_provider_uri: "https://ropsten.infura.io/truffle"
    }
  };

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

    build_directory: function() {
      return path.join(self.working_directory, "build");
    },
    contracts_directory: function() {
      return path.join(self.working_directory, "contracts");
    },
    contracts_build_directory: function() {
      return path.join(self.build_directory, "contracts");
    },
    migrations_directory: function() {
      return path.join(self.working_directory, "migrations");
    },
    test_directory: function() {
      return path.join(self.working_directory, "test");
    },
    test_file_extension_regexp: function() {
      return /.*\.(js|es|es6|jsx|sol)$/
    },
    example_project_directory: function() {
      return path.join(self.truffle_directory, "example");
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
        throw new Error("Do not set config.network_id. Instead, set config.networks and then config.network.");
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

        var current_values = {};

        if (self._values.gas) current_values.gas = self._values.gas;
        if (self._values.gasPrice) current_values.gasPrice = self._values.gasPrice;
        if (self._values.from) current_values.from = self._values.from;

        conf = _.extend({}, default_tx_values, conf, current_values);

        return conf;
      },
      set: function(val) {
        throw new Error("Do not set config.network_config. Instead, set config.networks and then config.network.");
      }
    },
    from: function() {
      try {
        return self.network_config.from;
      } catch (e) {
        return default_tx_values.from;
      }
    },
    gas: function() {
      try {
        return self.network_config.gas;
      } catch (e) {
        return default_tx_values.gas;
      }
    },
    gasPrice: function() {
      try {
        return self.network_config.gasPrice;
      } catch (e) {
        return default_tx_values.gasPrice;
      }
    },
    provider: function() {
      if (!self.network) {
        return null;
      }

      var options = self.network_config;
      options.verboseRpc = self.verboseRpc;
      return Provider.create(options);
    }
  };

  Object.keys(props).forEach(function(prop) {
    self.addProp(prop, props[prop]);
  });
};

Config.prototype.addProp = function(key, obj) {
  Object.defineProperty(this, key, {
    get: obj.get || function() {
      return this._values[key] || obj();
    },
    set: obj.set || function(val) {
      this._values[key] = val;
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
      self[key] = clone[key];
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
  // Only attempt to detect the backup if a specific file wasn't asked for.
  var checkBackup = false;

  if (filename == null) {
    filename = DEFAULT_CONFIG_FILENAME;
    checkBackup = true;
  }

  var file = findUp.sync(filename, {cwd: options.working_directory || options.workingDirectory});

  if (file == null) {
    if (checkBackup == true) {
      return this.detect(options, BACKUP_CONFIG_FILENAME);
    } else {
      throw new TruffleError("Could not find suitable configuration file.");
    }
  }

  return this.load(file, options);
};

Config.load = function(file, options) {
  var config = new Config();

  config.working_directory = path.dirname(path.resolve(file));

  var static_config = requireNoCache(file);

  config.merge(static_config);
  config.merge(options);

  return config;
};

module.exports = Config;
