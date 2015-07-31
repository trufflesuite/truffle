var fs = require("fs");
var dir = require("node-dir");
var deasync = require("deasync");
var filesSync = deasync(dir.files);
var subdirSync = deasync(dir.subdirs);
var _ = require("lodash");
var web3 = require("web3");
var loadconf = deasync(require("./loadconf"));

var Config = {
  gather(truffle_dir, working_dir, grunt, desired_environment) {
    var config = {};
    config = _.merge(config, {
      grunt: grunt,
      truffle_dir: truffle_dir,
      working_dir: working_dir,
      environments: {
        directory: `${working_dir}/config`,
        available: {},
        current: {}
      },
      app: {
        configfile: `${working_dir}/config/app.json`,
        directory: `${working_dir}/app`,
        // Default config objects that'll be overwritten by working_dir config.
        resolved: {
          frontend: {},
          deploy: [],
          rpc: {},
          processors: {},
          provider: null
        }
      },
      frontend: {
        contract_inserter_filename: `${truffle_dir}/lib/insert_contracts.js`,
        includes: [
          `${truffle_dir}/node_modules/bluebird/js/browser/bluebird.js`,
          `${truffle_dir}/node_modules/web3/dist/web3.min.js`,
          `${truffle_dir}/node_modules/ether-pudding/build/ether-pudding.js`
        ]
      },
      example: {
        directory: `${truffle_dir}/example`,
        contract: {
          directory: `${truffle_dir}/example/contracts`,
          filename: `${truffle_dir}/example/contracts/Example.sol`,
          name: "Example",
          variable: "example"
        },
        test: {
          directory: `${truffle_dir}/example/test`,
          filename: `${truffle_dir}/example/test/example.coffee`
        }
      },
      contracts: {
        classes: {},
        directory: `${working_dir}/contracts`
      },
      tests: {
        directory: `${working_dir}/test`
      },
      build: {
        directory: `${working_dir}/build`,
        defaults: {
          "post-process": {
            "app.js": [
              "inject-contracts",
              "frontend-dependencies"
            ]
          }
        }
      },
      dist: {
        directory: `${working_dir}/dist`,
        defaults: {
          "post-process": {
            "app.js": [
              "inject-contracts",
              "frontend-dependencies",
              "uglify"
            ]
          }
        }
      },
      processors: {
        // These processors do nothing, but are registered to reduce warnings.
        ".html": `${truffle_dir}/lib/processors/html.es6`,
        ".js": `${truffle_dir}/lib/processors/null.es6`,
        ".css": `${truffle_dir}/lib/processors/null.es6`,
        ".json": `${truffle_dir}/lib/processors/null.es6`,

        // Helpful default processors.
        ".coffee": `${truffle_dir}/lib/processors/coffee.es6`,
        ".scss": `${truffle_dir}/lib/processors/scss.es6`,

        // Babel-related processors.
        ".es6": `${truffle_dir}/lib/processors/babel.es6`,
        ".es": `${truffle_dir}/lib/processors/babel.es6`,
        ".jsx": `${truffle_dir}/lib/processors/babel.es6`,

        // Named processors for post-processing.
        "null": `${truffle_dir}/lib/processors/null.es6`, // does nothing; useful in some edge cases.
        "uglify": `${truffle_dir}/lib/processors/post/uglify.es6`,
        "frontend-dependencies": `${truffle_dir}/lib/processors/post/frontend_dependencies.es6`,
        "inject-contracts": `${truffle_dir}/lib/processors/post/inject_contracts.es6`
      }
    });

    desired_environment = grunt.option("e") || grunt.option("environment") || process.env.NODE_ENV || desired_environment;

    // Try to find the desired environment, and fall back to development if we don't find it.
    for (var environment of [desired_environment, "development"]) {
      var environment_directory = `${config.environments.directory}/${environment}`;
      if (!fs.existsSync(environment_directory)) {
        continue;
      }

      // I put this warning here but now I'm not sure if I want it.
      if (environment != desired_environment && desired_environment != null) {
        console.log(`Warning: Couldn't find environment ${desired_environment}.`);
      }

      config.environment = desired_environment;
      config.environments.current.directory = environment_directory;
      config.environments.current.filename = `${environment_directory}/config.json`;
      config.environments.current.contracts_filename = `${environment_directory}/contracts.json`;

      break;
    }

    // If we didn't find an environment, but asked for one, error.
    if (config.environment == null && desired_environment != null) {
      console.log("Couldn't find any suitable environment. Check environment configuration.");
      process.exit(1);
    }

    // Get environments in working directory, if available.
    if (fs.existsSync(config.environments.directory)) {
      for (var directory of subdirSync(config.environments.directory)) {
        name = directory.substring(directory.lastIndexOf("/") + 1)
        config.environments.available[name] = directory;
      }
    }

    // Load the app config.
    if (fs.existsSync(config.app.configfile)) {
      config.app.resolved = loadconf(config.app.configfile, config.app.resolved);
    }

    // Now overwrite any values from the environment config.
    if (fs.existsSync(config.environments.current.filename)) {
      config.app.resolved = loadconf(config.environments.current.filename, config.app.resolved);
    }

    // Helper function for expecting paths to exist.
    config.expect = function(path, description, extra="") {
      if (!fs.existsSync(path)) {
        display_path = "." + path.replace(this.working_dir, "");
        console.log `Couldn't find ${description} at ${display_path}. ${extra}`;
        process.exit(1)
      }
    };

    config.test_connection = function(callback) {
      web3.eth.getCoinbase(function(error, coinbase) {
        if (error != null) {
          error = new Error("Could not connect to your RPC client. Please check your RPC configuration.");
        }

        callback(error, coinbase)
      });
    };

    // Find the processors and then turn them into executable functions.
    for (var extension in config.processors) {
      var file = config.processors[extension];
      config.processors[extension] = require(file);
    }

    for (var extension in config.app.resolved.processors) {
      var file = config.app.resolved.processors[extension];
      var full_path = `${working_dir}/${file}`
      extension = extension.toLowerCase();
      config.expect(full_path, `specified .${extension} processor`, "Check your app config.")
      config.processors[extension] = require(full_path);
    }

    // Evaluate frontend targets, making the configuration conform, adding
    // default post processing, if any.
    for (var target in config.app.resolved.frontend) {
      var options = config.app.resolved.frontend[target];
      if (typeof options == "string") options = [options];
      if (options instanceof Array) {
        options = {
          files: options,
          "post-process": {
            build: [],
            dist: []
          }
        }
      }

      if (options["post-process"] == null) {
        options["post-process"] = {build: [], dist: []};
      }

      // Check for default post processing for this target,
      // and add it if the target hasn't specified any post processing.
      var contexts = ["build", "dist"];
      for (var index in contexts) {
        var context = contexts[index];
        if (config[context].defaults["post-process"][target] != null && options["post-process"][context].length == 0) {
          options["post-process"][context] = config[context].defaults["post-process"][target];
        }
      }

      config.app.resolved.frontend[target] = options;
    }

    // Get contracts in working directory, if available.
    if (fs.existsSync(config.contracts.directory)) {
      for (file of filesSync(config.contracts.directory)) {
        var name = file.substring(file.lastIndexOf("/") + 1, file.lastIndexOf("."));
        config.contracts.classes[name] = {
          source: file
        }
      }
    }

    // Now merge those contracts with what's in the configuration, if any.
    if (fs.existsSync(config.environments.current.contracts_filename)) {
      var current_contracts = loadconf(config.environments.current.contracts_filename);
      for (var name in current_contracts) {
        var contract = current_contracts[name];
        // Don't import any deleted contracts.
        if (!fs.existsSync(contract.source)) {
          continue;
        }
        config.contracts.classes[name] = contract;
      }
    }

    if (config.app.resolved.provider == null) {
      config.provider = new web3.providers.HttpProvider(`http://${config.app.resolved.rpc.host}:${config.app.resolved.rpc.port}`)
    } else {
      config.provider = require(`${config.working_dir}/${config.app.resolved.provider}`)
    }

    if (config.provider == null) {
      throw "Could not correctly set your web3 provider. Please check your app configuration."
    }

    web3.setProvider(config.provider);

    if (grunt.option("verbose-rpc") != null) {
      // // If you want to see what web3 is sending and receiving.
      var oldAsync = config.provider.sendAsync;
      config.provider.sendAsync = function(options, callback) {
        console.log("   > " + JSON.stringify(options, null, 2).split("\n").join("\n   > "));
        oldAsync.call(config.provider, options, function(error, result) {
          if (error != null) {
            console.log(" <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   "));
          }
          callback(error, result)
        });
      };
    }

    return config
  }
}

module.exports = Config;
