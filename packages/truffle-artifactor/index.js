var fs = require("fs-extra");
var path = require("path");
var class_template = fs.readFileSync(path.join(__dirname, "templates", "class.js"), {encoding: "utf8"});
var pkg = require("./package.json");
var dir = require("node-dir");
var async = require("async");
var Module = require('module');
var vm = require('vm');
var Web3 = require("web3")
var _ = require("lodash");

module.exports = {
  // {
  //   contract_name: "...",
  //   abi: [...],                 (optional if already set)
  //   unlinked_binary: "0x...",   (optional if already set)
  //   address: "0x..." or null,
  //   links: {...},
  //   events: {...},
  //   network_id: ...,            (defaults to "*")
  // }

  save: function(options, filename, binary_filename, extra_options) {
    var self = this;

    if (typeof binary_filename == "object") {
      extra_options = binary_filename;
      binary_filename = null;
    }

    return new Promise(function(accept, reject) {
      if (filename == null) {
        throw new Error("You must specify a file name.");
      }

      options = self.normalizeOptions(options, extra_options);

      fs.readFile(filename, {encoding: "utf8"}, function(err, source) {
        // No need to handle the error. If the file doesn't exist then we'll start afresh
        // with a new binary (see generateBinary()).
        var existing_binary;

        if (!err) {
          try {
            var Contract = self._requireFromSource(source, filename);
            existing_binary = Contract.binaries;
          } catch (e) {
            // If requiring fails there's nothing we can do with it.
          }
        }

        var has_binary_filename = !!binary_filename;

        var final_binary = self.generateBinary(options, existing_binary);
        var final_source;

        if (has_binary_filename) {
          final_source = self.generateAbstraction(binary_filename);
        } else {
          final_source = self.generateAbstraction(final_binary);
        }

        async.parallel([
          fs.outputFile.bind(fs, filename, final_source, "utf8"),
          function(c) {
            if (has_binary_filename) {
              fs.outputFile(binary_filename, JSON.stringify(final_binary, null, 2), "utf8", c);
            } else {
              c();
            }
          }
        ], function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    });
  },

  saveAll: function(contracts, destination, options, binary_destination) {
    var self = this;
    options = options || {};
    binary_destination = binary_destination || path.join(destination, "bin");

    if (Array.isArray(contracts)) {
      var arr = contracts;
      contracts = {};
      arr.forEach(function(contract) {
        contracts[contract.contract_name] = contract;
      });
    }

    return new Promise(function(accept, reject) {
      fs.stat(destination, function(err, stat) {
        if (err) {
          return reject(new Error("Desination " + destination + " doesn't exist!"));
        }

        async.each(Object.keys(contracts), function(contract_name, done) {
          var contract_data = contracts[contract_name];
          var filename = path.join(destination, contract_name + ".sol.js");
          var binary_filename = path.join(binary_destination, contract_name + ".json");

          // Add the contract name to our extra options, without editing
          // the options object on its own.
          options = _.extend({}, options, {contract_name: contract_name});

          // Finally save the contract.
          self.save(contract_data, filename, binary_filename, options).then(done).catch(done);
        }, function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    });
  },

  generateBinary: function(options, existing_binary) {
    var web3 = new Web3();

    existing_binary = existing_binary || {};

    if (options.overwrite == true) {
      existing_binary = {};
    }

    existing_binary.contract_name = options.contract_name || existing_binary.contract_name || "Contract";
    existing_binary.default_network = options.default_network || existing_binary.default_network || "*";

    options.network_id = (options.network_id || "*") + ""; // Assume fallback network if network not specified.

    existing_binary.abi = options.abi || existing_binary.abi;
    existing_binary.unlinked_binary = options.unlinked_binary || existing_binary.unlinked_binary;

    // Ensure unlinked binary starts with a 0x
    if (existing_binary.unlinked_binary && existing_binary.unlinked_binary.indexOf("0x") < 0) {
      existing_binary.unlinked_binary = "0x" + existing_binary.unlinked_binary;
    }

    // Make sure we have a network for the binary we're saving.
    existing_binary.networks = existing_binary.networks || {};
    existing_binary.networks[options.network_id] = existing_binary.networks[options.network_id] || {};

    var updated_at = new Date().getTime();

    var network = existing_binary.networks[options.network_id];

    // Override specific keys
    network.address = options.address;
    network.links = options.links;

    // merge events with any that previously existed
    network.events = _.merge({}, network.events, options.events);

    // Now overwrite any events with the most recent data from the ABI.
    existing_binary.abi.forEach(function(item) {
      if (item.type != "event") return;

      var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";
      network.events["0x" + web3.sha3(signature)] = item;
    });

    network.updated_at = updated_at;

    // Ensure all networks have a `links` object.
    Object.keys(existing_binary.networks).forEach(function(network_id) {
      var network = existing_binary.networks[network_id];
      network.links = network.links || {};
    });

    existing_binary.generated_with = pkg.version;
    existing_binary.updated_at = updated_at;

    return existing_binary;
  },

  generateAbstraction: function(binary_location) {
    var binaries;

    if (typeof binary_location == "object") {
      binaries = JSON.stringify(binary_location, null, 2);
    } else {
      binaries = "require(\"" + binary_location + "\");";
    }

    var classfile = class_template;
    classfile = classfile.replace(/\{\{BINARIES\}\}/g, binaries);
    classfile = classfile.replace(/\{\{PUDDING_VERSION\}\}/g, pkg.version);

    return classfile;
  },

  whisk: function(options, networks) {
    options = this.normalizeOptions(options);

    var existing_binary = {
      networks: networks
    };

    var binary = this.generateBinary(options, existing_binary);
    var source = this.generateAbstraction(binary);
    return this._requireFromSource(source, options.contract_name + ".sol.js");
  },

  // Will upgrade all .sol.js files in place.
  // Used for a past version bump. May not be useful any longer.
  upgrade: function(source_directory, callback) {
    var self = this;
    var Pudding = require(".");

    if (!fs.existsSync(source_directory)) {
      callback(new Error("Source directory " + source_directory + " doesn't exist!"));
    }

    dir.files(source_directory, function(err, files) {
      if (err != null) {
        callback(err);
        return;
      }

      var found = [];

      for (var file of files) {
        if (path.basename(file).indexOf(".sol.js") > 0) {
          var cls = require(file);
          cls = cls.load(Pudding);

          var source = self.generate(cls.contract_name, {
            abi: cls.abi,
            unlinked_binary: cls.binary,
            address: cls.address
          });

          fs.writeFileSync(file, source, {encoding: "utf8"});
        }
      }

      callback(null, found);
    });
  },

  // options.provider
  // options.defaults
  requireFile: function(file, options, callback) {
    var self = this;

    if (typeof options == "function") {
      callback = options;
      options = {};
    }

    options = options || {};

    fs.readFile(file, {encoding: "utf8"}, function(err, body) {
      if (err) return callback(err);

      var contract;
      try {
        contract = self._requireFromSource(body, file);
      } catch (e) {
        return callback(e);
      }

      if (options.provider != null) {
        contract.setProvider(options.provider);
      }

      if (options.defaults != null) {
        contract.defaults(options.defaults);
      }

      if (options.network_id != null) {
        contract.setNetwork(options.network_id);
      }

      callback(null, contract);
    });
  },

  // options.source_directory: directory of .sol.js files.
  // options.files: Specific files to require. Use instead of source_directory
  // options.provider: Optional. Will set the provider for each contract required.
  // options.defaults: Optional. Set defaults for each contract required.
  // options.network_id: Optional. Set the network_id after require.
  requireAll: function(options, callback) {
    if (typeof options == "string") {
      options = {
        source_directory: options
      };
    }

    var self = this;

    this.contractFiles(options.source_directory || options.files, function(err, files) {
      async.map(files, function(file, finished) {
        self.requireFile(file, options, finished);
      }, callback);
    });
  },

  contractFiles: function(files_or_directory, extension, cb) {
    if (typeof extension == "function") {
      cb = extension;
      extension = ".sol.js";
    }

    if (Array.isArray(files_or_directory)) {
      return cb(files_or_directory);
    }

    dir.files(files_or_directory, function(err, files) {
      if (err) return cb(err);
      files = files.filter(function(file) {
        return path.basename(file).indexOf(extension) > 0 && path.basename(file)[0] != ".";
      });
      cb(null, files);
    });
  },

  _requireFromSource: function(source, filename) {
    // Modified from here: https://gist.github.com/anatoliychakkaev/1599423
    // Allows us to require asynchronously while allowing specific dependencies.
    var m = new Module(filename);

    // Provide all the globals listed here: https://nodejs.org/api/globals.html
    var context = {
      Buffer: Buffer,
      __dirname: path.dirname(filename),
      __filename: filename,
      clearImmediate: clearImmediate,
      clearInterval: clearInterval,
      clearTimeout: clearTimeout,
      console: console,
      exports: exports,
      global: global,
      module: m,
      process: process,
      require: require,
      setImmediate: setImmediate,
      setInterval: setInterval,
      setTimeout: setTimeout,
    };

    var script = vm.createScript(source, filename);
    script.runInNewContext(context);

    return m.exports;
  },

  // Options passed to Pudding can be many things.
  // This normalizes them into one object.
  normalizeOptions: function(options, extra_options) {
    extra_options = extra_options || {};
    var normalized = {};
    var expected_keys = [
      "contract_name",
      "abi",
      "binary",
      "unlinked_binary",
      "address",
      "links",
      "events",
      "network_id",
      "default_network"
    ];

    // FYI: options can be three things:
    // - normal object
    // - contract object
    // - solc output

    // Merge options/contract object first, then extra_options
    expected_keys.forEach(function(key) {
      var value;

      try {
        // Will throw an error if key == address and address doesn't exist.
        value = options[key];

        if (value != undefined) {
          normalized[key] = value;
        }
      } catch (e) {
        // Do nothing.
      }

      try {
        // Will throw an error if key == address and address doesn't exist.
        value = extra_options[key];

        if (value != undefined) {
          normalized[key] = value;
        }
      } catch (e) {
        // Do nothing.
      }
    });

    // Now look for solc specific items.
    if (options.interface != null) {
      normalized.abi = JSON.parse(options.interface);
    }

    if (options.bytecode != null) {
      normalized.unlinked_binary = options.bytecode
    }

    // Assume any binary passed is the unlinked binary
    if (normalized.unlinked_binary == null && normalized.binary) {
      normalized.unlinked_binary = normalized.binary;
    }

    delete normalized.binary;

    return normalized;
  }
};
