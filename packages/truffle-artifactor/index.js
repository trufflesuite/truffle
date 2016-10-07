var fs = require("fs");
var path = require("path");
var class_template = fs.readFileSync(path.join(__dirname, "./classtemplate.js"), {encoding: "utf8"});
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

  save: function(options, filename, extra_options) {
    var self = this;
    var web3 = new Web3();

    if (filename == null) {
      throw new Error("You must specify a file name.");
    }

    options = this.normalizeOptions(options, extra_options);

    return new Promise(function(accept, reject) {
      fs.readFile(filename, {encoding: "utf8"}, function(err, source) {
        var existing_networks = {};
        options.default_network = (options.default_network || "*") + ""; // Use fallback network if default not specified.
        options.network_id = (options.network_id || "*") + ""; // Assume fallback network if network not specified.

        // If no error during reading, file exists.
        if (options.overwrite != true && err == null) {
          var Contract = self._requireFromSource(source, filename);

          // If the default is the fallback but a default is specified in the file
          // then use the default network in the file.
          if (options.default_network == "*" && Contract.default_network) {
            options.default_network = Contract.default_network;
          }

          options.abi = options.abi || Contract.abi;
          options.unlinked_binary = options.unlinked_binary || Contract.unlinked_binary;

          existing_networks = Contract.all_networks;
        }

        if (existing_networks[options.network_id] == null) {
          existing_networks[options.network_id] = {};
        }

        var network = existing_networks[options.network_id];

        // Override specific keys
        network.address = options.address;
        network.links = options.links;

        // merge events with any that previously existed
        network.events = _.merge({}, network.events, options.events);

        // Now overwrite any events with the most recent data from the ABI.
        options.abi.forEach(function(item) {
          if (item.type != "event") return;

          var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";
          network.events["0x" + web3.sha3(signature)] = item;
        });

        // Update timestamp (legacy value)
        network.updated_at = new Date().getTime();

        // Ensure unlinked binary starts with a 0x
        if (network.unlinked_binary && network.unlinked_binary.indexOf("0x") < 0) {
          network.unlinked_binary = "0x" + network.unlinked_binary;
        }

        // Generate the source and write it out.
        var final_source = self.generate(options, existing_networks);

        fs.writeFile(filename, final_source, "utf8", function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    });
  },

  saveAll: function(contracts, destination, options) {
    var self = this;
    options = options || {};

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

          // Add the contract name to our extra options, without editing
          // the options object on its own.
          options = _.extend({}, options, {contract_name: contract_name});

          // Finally save the contract.
          self.save(contract_data, filename, options).then(done).catch(done);
        }, function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    });
  },

  generate: function(options, networks) {
    if (options.contract_name == null) {
      options.contract_name = "Contract";
    }

    // Ensure unlinked_binary is prefixed properly
    if (options.unlinked_binary && options.unlinked_binary.indexOf("0x") != 0) {
      options.unlinked_binary = "0x" + options.unlinked_binary;
    }

    if (this.isSingleLevelObject(networks)) {
      networks = {
        "*": networks
      };
    }

    // Ensure all networks have a `links` object.
    Object.keys(networks).forEach(function(network_id) {
      var network = networks[network_id];
      network.links = network.links || {};
    });

    var classfile = class_template;

    classfile = classfile.replace(/\{\{ALL_NETWORKS\}\}/g, JSON.stringify(networks, null, 2));
    classfile = classfile.replace(/\{\{NAME\}\}/g, options.contract_name);
    classfile = classfile.replace(/\{\{ABI\}\}/g, JSON.stringify(options.abi, null, 2));
    classfile = classfile.replace(/\{\{UNLINKED_BINARY\}\}/g, options.unlinked_binary);
    classfile = classfile.replace(/\{\{DEFAULT_NETWORK\}\}/g, options.default_network);
    classfile = classfile.replace(/\{\{PUDDING_VERSION\}\}/g, pkg.version);
    classfile = classfile.replace(/\{\{UPDATED_AT\}\}/g, new Date().getTime());

    return classfile;
  },

  whisk: function(contract_name, abi, unlinked_binary, networks) {
    var source = this.generate(contract_name, abi, unlinked_binary, networks);
    return this._requireFromSource(source, contract_name + ".sol.js");
  },

  isSingleLevelObject: function(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = obj[key];

      if (typeof val == "object" && !Array.isArray(val)) {
        return false;
      }
    }
    return true;
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
      if (options[key] != undefined) {
        normalized[key] = options[key];
      }

      if (extra_options[key] != undefined) {
        normalized[key] = extra_options[key];
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
