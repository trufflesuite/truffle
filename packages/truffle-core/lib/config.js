var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var Provider = require("./provider");
var ConfigurationError = require('./errors/configurationerror');
var requireNoCache = require("./require-nocache");
var findUp = require("find-up");

var DEFAULT_CONFIG_FILENAME = "truffle.js";

function Config(truffle_directory, working_directory, network) {
  var self = this;

  this._values = {
    truffle_directory: truffle_directory || path.resolve(path.join(__dirname, "../")),
    working_directory: working_directory || process.cwd(),
    network: network || "default"
  };

  var props = {
    // First three already set.
    truffle_directory: function() {},
    working_directory: function() {},
    network: function() {},

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
        "default": {},
        "test": {}
      }
    },
    example_project_directory: function() {
      return path.join(self.truffle_directory, "example");
    },
    templates: function() {
      return {
        test: {
          filename: path.join(self.truffle_directory, "templates", "example.js"),
          variable: "example"
        },
        contract: {
          filename: path.join(self.truffle_directory, "templates", "Example.sol"),
          name: "Example",
          variable: "example"
        }
      };
    },
    rpc: function() {
      return {
        host: "localhost",
        port: "8545",
        gas: 4712388,
        gasPrice: 100000000000, // 100 Shannon,
        from: null
      }
    }
  };

  Object.keys(props).forEach(function(prop) {
    self.addProp(prop, props[prop]);
  });
};

Config.prototype.addProp = function(key, default_getter) {
  Object.defineProperty(this, key, {
    get: function() {
      return this._values[key] || default_getter();
    },
    set: function(val) {
      this._values[key] = val;
    },
    configurable: true,
    enumerable: true
  });
};

Config.prototype.getProvider = function(options) {
  options = options || {};

  var rpc_options = this.getRPCConfig(options);
  return Provider.create(rpc_options);
};

Config.prototype.getRPCConfig = function(options) {
  options = options || {};

  var network_id = options.network_id || this.network;

  if (this.networks[network_id] == null) {
    throw new ConfigurationError("Cannot find network '" + network_id + "'");
  }

  return _.merge(options, this.rpc, this.networks[network_id])
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

Config.detect = function(network, filename) {
  if (filename == null) {
    filename = DEFAULT_CONFIG_FILENAME;
  }

  var file = findUp.sync(filename);

  if (file == null) {
    throw new ConfigurationError("Could not find suitable configuration file.");
  }

  return this.load(file, network);
};

Config.load = function(file, network) {
  var config = new Config();

  config.working_directory = path.dirname(path.resolve(file));

  var static_config = requireNoCache(file);

  config = _.merge(config, static_config);

  if (network) {
    config.network = network;
  }

  return config;
};

module.exports = Config;
