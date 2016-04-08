var fs = require("fs");
var dir = require("node-dir");
var deasync = require("deasync");
var filesSync = deasync(dir.files);
var subdirSync = deasync(dir.subdirs);
var _ = require("lodash");
var Web3 = require("web3");
var loadconf = deasync(require("./loadconf"));
var path = require("path");
var Exec = require("./exec");
var ConfigurationError = require('./errors/configurationerror');
var Pudding = require("ether-pudding");
var PuddingLoader = require("ether-pudding/loader");

var Config = {
  gather: function(truffle_dir, working_dir, argv, desired_environment) {
    var config = {};
    config = _.merge(config, {
      argv: argv,
      truffle_dir: truffle_dir,
      working_dir: working_dir,
      web3: new Web3(),
      environments: {
        directory: path.join(working_dir, "environments"),
        configfilename: "config.js",
        oldconfigfilename: "config.json",
        available: {},
        current: {}
      },
      app: {
        configfile: path.join(working_dir, "truffle.js"),
        oldconfigfile: path.join(working_dir, "truffle.json"),
        directory: path.join(working_dir, "app"),
        // Default config objects that'll be overwritten by working_dir config.
        resolved: {
          build: {},
          include_contracts: true,
          deploy: [],
          after_deploy: [],
          rpc: {},
          processors: {},
        }
      },
      example: {
        directory: path.join(truffle_dir, "example")
      },
      templates: {
        test: {
          filename: path.join(truffle_dir, "templates", "example.js"),
          variable: "example"
        },
        contract: {
          filename: path.join(truffle_dir, "templates", "Example.sol"),
          name: "Example",
          variable: "example"
        }
      },
      contracts: {
        classes: {},
        directory: path.join(working_dir, "contracts"),
        build_directory: null
      },
      tests: {
        directory: path.join(working_dir, "test"),
        filter: /.*\.(js|es|es6|jsx)$/
      },
      build: {
        directory: null,
      },
      dist: {
        directory: null,
      },
      rpc: {
        defaults: {
          gas: 3141592,
          gasPrice: 100000000000, // 100 Shannon,
          from: null
        }
      }
    });

    // Check to see if we're working on a dapp meant for 0.2.x or older
    if (fs.existsSync(path.join(working_dir, "config", "app.json"))) {
      console.log("Your dapp is meant for an older version of Truffle. Don't worry, there are two solutions!")
      console.log("");
      console.log("1) Upgrade you're dapp using the followng instructions (it's easy):");
      console.log("   https://github.com/ConsenSys/truffle/wiki/Migrating-from-v0.2.x-to-v0.3.0");
      console.log("");
      console.log("   ( OR )")
      console.log("");
      console.log("2) Downgrade to Truffle 0.2.x");
      console.log("");
      console.log("Cheers! And file an issue if you run into trouble! https://github.com/ConsenSys/truffle/issues")
      process.exit();
    }

    config.requireNoCache = function(filePath) {
      //console.log("Requring w/o cache: " + path.resolve(filePath));
    	delete require.cache[path.resolve(filePath)];
    	return require(filePath);
    };

    desired_environment = argv.e || argv.environment || process.env.NODE_ENV || desired_environment;

    if (desired_environment) {
      // Try to find the desired environment, and fall back to development if we don't find it.
      for (var environment of [desired_environment, "development"]) {
        var environment_directory = path.join(config.environments.directory, environment);
        if (!fs.existsSync(environment_directory)) {
          continue;
        }

        // I put this warning here but now I'm not sure if I want it.
        if (environment != desired_environment && desired_environment != null) {
          console.log("Warning: Couldn't find environment " + desired_environment + ".");
        }

        config.environment = desired_environment;
        config.environments.current.directory = environment_directory;
        config.environments.current.filename = path.join(environment_directory, config.environments.configfilename);
        config.environments.current.oldfilename = path.join(environment_directory, config.environments.oldconfigfilename);

        break;
      }
    }

    // If we didn't find an environment, but asked for one, error.
    if (config.environment == null && desired_environment != null) {
      throw new ConfigurationError("Couldn't find any suitable environment. Check environment configuration.");
    }

    // Get environments in working directory, if available.
    if (fs.existsSync(config.environments.directory)) {
      for (var directory of subdirSync(config.environments.directory)) {
        name = directory.substring(directory.lastIndexOf("/") + 1)
        config.environments.available[name] = directory;
      }
    }

    // Load the app config.
    // For now, support both new and old config files.
    if (fs.existsSync(config.app.configfile)) {
      _.merge(config.app.resolved, config.requireNoCache(config.app.configfile));
    } else if (fs.existsSync(config.app.oldconfigfile)) {
      config.app.resolved = loadconf(config.app.oldconfigfile, config.app.resolved);
    }

    // Now merge default rpc details, only overwriting if not specified.
    _.mergeWith(config.app.resolved.rpc, config.rpc.defaults, function(objValue, srcValue) {
      return objValue != null ? objValue : srcValue;
    });

    // Load environment config
    if (fs.existsSync(config.environments.current.filename)) {
      _.merge(config.app.resolved, config.requireNoCache(config.environments.current.filename));
    } else if (fs.existsSync(config.environments.current.oldfilename)) {
      config.app.resolved = loadconf(config.environments.current.oldfilename, config.app.resolved);
    }

    if (fs.existsSync(config.environments.current.directory)) {
      // Overwrite build and dist directories
      config.build.directory = path.join(config.environments.current.directory, "build");
      config.dist.directory = path.join(config.environments.current.directory, "dist");
      config.contracts.build_directory = path.join(config.environments.current.directory, "contracts");
    }

    // Allow for deprecated build configuration.
    if (config.app.resolved.frontend != null) {
      config.app.resolved.build = config.app.resolved.frontend;
    }

    // Helper function for expecting paths to exist.
    config.expect = function(expected_path, description, extra, callback) {
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
    };

    config.test_connection = function(callback) {
      config.web3.eth.getCoinbase(function(error, coinbase) {
        if (error != null) {
          error = new Error("Could not connect to your RPC client. Please check your RPC configuration.");
        }

        callback(error, coinbase)
      });
    };

    // DEPRECATED: Resolve paths for default builder's extra processors.
    for (var extension in config.app.resolved.processors) {
      var file = config.app.resolved.processors[extension];
      var full_path = path.join(working_dir, file);
      config.app.resolved.processors[extension] = full_path;
    }

    var provider = new Web3.providers.HttpProvider("http://" + config.app.resolved.rpc.host + ":" + config.app.resolved.rpc.port);
    config.web3.setProvider(provider);

    if (argv.verboseRpc != null) {
      // // If you want to see what web3 is sending and receiving.
      var oldAsync = config.web3.currentProvider.sendAsync;
      config.web3.currentProvider.sendAsync = function(options, callback) {
        console.log("   > " + JSON.stringify(options, null, 2).split("\n").join("\n   > "));
        oldAsync.call(config.web3.currentProvider, options, function(error, result) {
          if (error == null) {
            console.log(" <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   "));
          }
          callback(error, result)
        });
      };
    }

    // Get contracts in working directory, if available.
    if (fs.existsSync(config.contracts.directory)) {
      for (file of filesSync(config.contracts.directory)) {

        // Ignore any files that aren't solidity files.
        if (path.extname(file) != ".sol" || path.basename(file)[0] == ".") {
          continue;
        }

        var name = path.basename(file, ".sol");
        var relative_path = file.replace(config.working_dir, "./");
        var stats = fs.statSync(file);

        config.contracts.classes[name] = {
          file: file,
          source: relative_path,
          source_modified_time: (stats.mtime || stats.ctime).getTime(),
          compiled_time: 0 // This will be overwritten if we find a compiled file
        }
      }
    }

    // Now merge those contracts with what's in the configuration, if any, using the loader.
    Pudding.setWeb3(config.web3);

    // Functionalize this so we can make it synchronous.
    function loadContracts(callback) {
      if (fs.existsSync(config.contracts.build_directory) == false) {
        return callback();
      }

      var contracts = {};
      PuddingLoader.load(config.contracts.build_directory, Pudding, contracts, function(err, names, data) {
        if (err) return callback(err);

        data.forEach(function(item) {
          var name = item.name;

          // Don't load a contract that's been deleted.
          if (!config.contracts.classes[name]) {
            return;
          }

          var stats;
          try {
            var stats = fs.statSync(item.file);
          } catch (e) {
            return callback(e);
          }

          var contract = contracts[name];
          config.contracts.classes[name].abi = contract.abi;
          config.contracts.classes[name].binary = contract.binary;
          config.contracts.classes[name].unlinked_binary = contract.unlinked_binary || contract.binary;
          config.contracts.classes[name].address = contract.address;
          config.contracts.classes[name].compiled_time = (stats.mtime || stats.ctime).getTime();
        });

        callback();
      });
    };

    var loader = deasync(loadContracts);
    loader();

    return config;
  }
}

module.exports = Config;
