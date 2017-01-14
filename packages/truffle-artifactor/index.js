var Schema = require("truffle-contract-schema");
var fs = require("fs-extra");
var path = require("path");
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

    return new Promise(function(accept, reject) {
      if (filename == null) {
        throw new Error("You must specify a file name.");
      }

      options =  Schema.normalizeOptions(options, extra_options);

      fs.readFile(filename, {encoding: "utf8"}, function(err, json) {
        // No need to handle the error. If the file doesn't exist then we'll start afresh
        // with a new binary (see generateBinary()).
        var existing_binary;

        if (!err) {
          try {
            existing_binary = JSON.parse(json);
          } catch (e) {
            // Do nothing
          }
        }

        var final_binary;
        try {
          final_binary = Schema.generateBinary(options, existing_binary);
        } catch (e) {
          return reject(e);
        }

        fs.outputFile(filename, JSON.stringify(final_binary, null, 2), "utf8", function(err) {
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
          var filename = path.join(destination, contract_name + ".json");

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
  }
};
