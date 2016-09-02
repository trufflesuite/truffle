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

// TODO: This should probably be asynchronous.
module.exports = {
  save: function(contract_name, contract_data, filename, options) {
    var self = this;
    var web3 = new Web3();

    if (typeof contract_name == "object") {
      options = filename;
      filename = contract_data;
      contract_data = contract_name;
      contract_name = "Contract";
    }

    options = options || {};

    this.normalizeContractData(contract_data);

    return new Promise(function(accept, reject) {
      fs.readFile(filename, {encoding: "utf8"}, function(err, source) {
        var existing_networks = {};

        // If no error during reading, file exists.
        if (options.overwrite != true && err == null) {
          var Contract = self._requireFromSource(source, filename);

          // Note: The || statement ensures we support old .sol.js files.
          existing_networks = Contract.all_networks || existing_networks;
        }

        var network_id = options.network_id || "default";

        if (existing_networks[network_id] == null) {
          existing_networks[network_id] = {};
        }

        var network = existing_networks[network_id];

        // merge only specific keys
        ["abi", "unlinked_binary", "address", "links"].forEach(function(key) {
          network[key] = contract_data[key] || network[key];
        });

        // merge events with any that previously existed
        network.events = _.merge({}, network.events, contract_data.events);

        // Now overwrite any events with the most recent data from the ABI.
        network.abi.forEach(function(item) {
          if (item.type != "event") return;

          var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";
          network.events["0x" + web3.sha3(signature)] = item;
        });

        // Remove legacy key
        delete network.binary;

        // Update timestamp
        network.updated_at = new Date().getTime();

        // Ensure unlinked binary starts with a 0x
        if (network.unlinked_binary && network.unlinked_binary.indexOf("0x") < 0) {
          network.unlinked_binary = "0x" + network.unlinked_binary;
        }

        // Set the default network if the default doesn't exist.
        var network_ids = Object.keys(existing_networks);
        if (network_ids.length == 1 && network_ids[0] != "default") {
          existing_networks["default"] = existing_networks[network_ids[0]];
        }

        // Generate the source and write it out.
        var final_source = self.generate(contract_name, existing_networks);

        fs.writeFile(filename, final_source, "utf8", function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    });
  },

  saveAll: function(contracts, destination, options) {
    var self = this;

    //console.log(contracts);

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

          self.save(contract_name, contract_data, filename, options).then(done).catch(done);
        }, function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    });
  },

  generate: function(contract_name, networks) {
    if (typeof contract_name == "object") {
      networks = contract_name;
      contract_name = "Contract";
    }

    if (this.isSingleLevelObject(networks)) {
      networks = {
        "default": networks
      };
    }

    var classfile = class_template;

    classfile = classfile.replace(/\{\{ALL_NETWORKS\}\}/g, JSON.stringify(networks, null, 2));
    classfile = classfile.replace(/\{\{NAME\}\}/g, contract_name);
    classfile = classfile.replace(/\{\{PUDDING_VERSION\}\}/g, pkg.version);

    return classfile;
  },

  whisk: function(contract_name, networks) {
    var source = this.generate(contract_name, networks);
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
  // options.network_id: Optiona. Set the network_id after require.
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

  // Allow input directly from solc.
  normalizeContractData: function(contract_data) {
    if (contract_data.interface != null) {
      contract_data.abi = JSON.parse(contract_data.interface);
    }

    if (contract_data.bytecode != null) {
      contract_data.unlinked_binary = contract_data.bytecode
    }

    if (contract_data.binary != null && contract_data.unlinked_binary == null) {
      contract_data.unlinked_binary = contract_data.binary;
    }
  }
};
