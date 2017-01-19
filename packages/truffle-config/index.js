var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var Provider = require("truffle-provider");
var TruffleError = require("truffle-error");
var requireNoCache = require("require-nocache");
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
    verboseRpc: false,
    gas: null,
    gasPrice: null,
    from: null,
    build: null,
    resolver: null,
    artifactor: null
  };

  var props = {
    // These are already set.
    truffle_directory: function() {},
    working_directory: function() {},
    network: function() {},
    verboseRpc: function() {},
    build: function() {},
    resolver: function() {},
    artifactor: function() {},

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
    networks: function() {
      return {};
    },
    network_id: function() {
      if (self.network == null) {
        throw new Error("Network not set. Cannot determine network to use.");
      }

      if (!self.network || !self.networks[self.network] || !self.networks[self.network].network_id) {
        return null;
      }

      return self.networks[self.network].network_id;
    },
    network_config: function() {
      if (self.network == null) {
        throw new Error("Network not set. Cannot determine network to use.");
      }

      var conf = self.networks[self.network];

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
    from: function() {
      return self.network_config.from;
    },
    gas: function() {
      return self.network_config.gas;
    },
    gasPrice: function() {
      return self.network_config.gasPrice;
    },
    provider: function() {
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

Config.prototype.with = function(obj) {
  return _.extend({}, this, obj);
};

Config.prototype.without = function(arr) {
  var options = this.with({});

  if (!Array.isArray(arr)) {
    arr = [arr];
  }

  arr.forEach(function(key) {
    delete options[key];
  });

  return _.extend(Config.default(), options);
}

Config.prototype.merge = function(obj) {
  return _.extend(this, obj);
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

  return _.extend(config, static_config, options);
};

module.exports = Config;
