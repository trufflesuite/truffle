var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var Provider = require("./provider");
var ConfigurationError = require('./errors/configurationerror');
var requireNoCache = require("./require-nocache");
var findUp = require("find-up");

var DEFAULT_CONFIG_FILENAME = "truffle.js";
var BACKUP_CONFIG_FILENAME = "truffle-config.js"; // For Windows + Command Prompt

function Config(truffle_directory, working_directory, network) {
  var self = this;

  this._values = {
    truffle_directory: truffle_directory || path.resolve(path.join(__dirname, "../")),
    working_directory: working_directory || process.cwd(),
    network: network || "default",
    verboseRpc: false,
    build: {},
    rpc: {
      host: "localhost",
      port: "8545",
      gas: 4712388,
      gasPrice: 100000000000, // 100 Shannon,
      from: null
    }
  };

  // RPC is a special configuration value. You can set it,
  // but that'll set the defaults. The values you get from it
  // will be the merged rpc results with the defaults.

  var props = {
    // These are already set.
    truffle_directory: function() {},
    working_directory: function() {},
    network: function() {},
    verboseRpc: function() {},
    build: function() {},

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
      return /.*\.(js|es|es6|jsx)$/
    },
    networks: function() {
      return {
        // "default": {},
        "test": {}
      }
    },
    network_id: function() {
      if (!self.network || !self.networks[self.network] || !self.networks[self.network].network_id) {
        return "default";
      }

      return self.networks[self.network].network_id;
    },
    network_config: function() {
      var conf = self.networks[self.network];

      if (conf == null && self.network == "default") {
        return {};
      }

      return conf;
    },
    example_project_directory: function() {
      return path.join(self.truffle_directory, "example");
    },
    rpc: {
      // This one is special. You'll always get the normalized
      // rpc values overridden by the network's values, even if you
      // set it. This might be an anti-pattern, however, but this is
      // less confusing than what was there previously.
      get: function() {
        return _.merge(this._values.rpc, this.network_config || {});
      },
      set: function(val) {
        this._values.rpc = val;
      }
    },
    provider: function() {
      var options = self.rpc;
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

Config.prototype.merge = function(obj) {
  return _.extend(this, obj);
};

// Helper function for expecting paths to exist.
Config.expect = function(expected_path, description, extra, callback) {
  if (typeof description == "function") {
    callback = description;
    description = "file";
    extra = "";
  }

  if (typeof extra == "function") {
    callback = extra;
    extra = "";
  }

  if (description == null) {
    description = "file";
  }

  if (extra == null) {
    extra = "";
  }

  if (!fs.existsSync(expected_path)) {
    var display_path = expected_path.replace(this.working_dir, "./");
    var error = new ConfigurationError("Couldn't find " + description + " at " + display_path + ". " + extra);

    if (callback != null) {
      callback(error);
      return false;
    } else {
      throw error;
    }
  }
  return true;
}

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

  var file = findUp.sync(filename);

  if (file == null) {
    if (checkBackup == true) {
      return this.detect(options, BACKUP_CONFIG_FILENAME);
    } else {
      throw new ConfigurationError("Could not find suitable configuration file.");
    }
  }

  return this.load(file, options);
};

Config.load = function(file, options) {
  var config = new Config();

  config.working_directory = path.dirname(path.resolve(file));

  var static_config = requireNoCache(file);

  return _.merge(config, static_config, options);
};

module.exports = Config;
