#!/usr/bin/env node
require("babel-register");

var path = require("path");
var fs = require("fs");
var chokidar = require('chokidar');
var deasync = require("deasync");
var colors = require('colors/safe');
var temp = require("temp").track();
var filesSync = deasync(require("node-dir").files);
var Truffle = require('./index.js');

var ConfigurationError = require("./lib/errors/configurationerror");
var ExtendableError = require("./lib/errors/extendableerror");
var copy = require('./lib/copy');

var argv = require('yargs').argv;

var truffle_dir = process.env.TRUFFLE_NPM_LOCATION || argv.n || argv.npm_directory || __dirname;
var working_dir = process.env.TRUFFLE_WORKING_DIRECTORY || argv.w || argv.working_directory || process.cwd();
var environment = argv.e || argv.environment || process.env.NODE_ENV || "default";

if (working_dir[working_dir.length - 1] != "/") {
  working_dir += "/";
}

var pkg = JSON.parse(fs.readFileSync(path.join(truffle_dir, "package.json"), {encoding: "utf8"}));

var tasks = {};
var registerTask = function(name, description, fn) {
  tasks[name] = {
    name: name,
    description: description,
    fn: fn
  };
}

var printNetwork = function() {
  console.log("Using network " + environment + ".");
};

var printSuccess = function() {
  console.log(colors.green("Completed without errors on " + new Date().toString()));
};

var printFailure = function() {
  console.log(colors.red("Completed with errors on " + new Date().toString()));
};

var runTask = function(name) {
  try {
    var fn = deasync(tasks[name].fn);
    return fn() || 0;
  } catch (e) {
    if (e instanceof ExtendableError) {
      console.log(e.message);

      if (argv.stack != null) {
        console.log(e.stack);
      }

    } else {
      // Bubble up all other unexpected errors.
      console.log(e.stack || e.toString());
    }
    return 1;
  }
};

registerTask('watch', "Watch filesystem for changes and rebuild the project automatically", function(done) {
  var needs_rebuild = true;

  chokidar.watch(["app/**/*", "environments/*/contracts/**/*", "contracts/**/*", "truffle.json", "truffle.js"], {
    ignored: /[\/\\]\./, // Ignore files prefixed with "."
    cwd: working_dir,
    ignoreInitial: true
  }).on('all', function(event, filePath) {
    // On changed/added/deleted
    var display_path = path.join("./", filePath.replace(working_dir, ""));
    console.log(colors.cyan(">> File " + display_path + " changed."));

    needs_rebuild = true;
  });

  var check_rebuild = function() {
    if (needs_rebuild == true) {
      needs_rebuild = false;
      console.log("Rebuilding...");
      if (runTask("build") != 0) {
        printFailure();
      }
    }

    setTimeout(check_rebuild, 200);
  };

  check_rebuild();
});

registerTask('list', "List all available tasks", function(done) {
  console.log("Truffle v" + pkg.version + " - a development framework for Ethereum");
  console.log("");
  console.log("Usage: truffle [command] [options]");
  console.log("");
  console.log("Commands:");
  console.log("");

  var sorted = Object.keys(tasks).sort();

  var longestTask = sorted.reduce(function(a, b) {
    var first = typeof a == "string" ? a.length : a;
    return Math.max(first, b.length);
  });

  for (var i = 0; i < sorted.length; i++) {
    var task = tasks[sorted[i]];
    var heading = task.name;
    while (heading.length < longestTask) {
      heading += " ";
    }
    console.log("  " + heading + " => " + task.description)
  }

  console.log("");
  done();
});

registerTask('version', "Show version number and exit", function(done) {
  console.log("Truffle v" + pkg.version);
  done();
});

registerTask('init', "Initialize new Ethereum project, including example contracts and tests", function(done) {
  var config = Truffle.config.default();
  Truffle.init(config.working_directory, done);
});

registerTask('create:contract', "Create a basic contract", function(done) {
  var config = Truffle.config.detect(environment, argv);

  var name = argv.name;

  if (name == null && argv._.length > 1) {
    name = argv._[1];
  }

  if (name == null) {
    throw new ConfigurationError("Please specify a name. Example: truffle create:contract MyContract");
  } else {
    Truffle.create.contract(config, name, done);
  }
});

registerTask('create:test', "Create a basic test", function(done) {
  // Force the test environment.
  environment = "test";
  printNetwork();
  var config = Truffle.config.detect(environment, argv);

  var name = argv.name;

  if (name == null && argv._.length > 1) {
    name = argv._[1];
  }

  if (name == null) {
    throw new ConfigurationError("Please specify a name. Example: truffle create:test MyTest");
  } else {
    Truffle.create.test(config, name, done);
  }
});

registerTask('compile', "Compile contracts", function(done) {
  var config = Truffle.config.detect(environment, argv);
  Truffle.contracts.compile({
    all: argv.all === true,
    source_directory: config.contracts_directory,
    contracts_build_directory: config.contracts_build_directory,
    quiet: argv.quiet === true,
    strict: argv.strict === true,
    network: config.network,
    network_id: config.network_id
  }, done);
});

registerTask('build', "Build development version of app", function(done) {
  var config = Truffle.config.detect(environment, argv);
  Truffle.build.build({
    builder: config.build,
    build_directory: config.build_directory,
    working_directory: config.working_directory,
    contracts_build_directory: config.contracts_build_directory,
    processors: config.processors, // legacy option for default builder
    network: config.network,
    network_id: config.network_id,
    provider: config.provider,
    rpc: config.getRPCConfig()
  }, function(err) {
    done(err);
    if (err == null) {
      printSuccess();
    }
  });
});

registerTask('migrate', "Run migrations", function(done) {
  var config = Truffle.config.detect(environment, argv);

  Truffle.contracts.compile({
    all: argv.compileAll === true,
    source_directory: config.contracts_directory,
    contracts_build_directory: config.contracts_build_directory,
    network: config.network,
    quiet: argv.quiet === true,
    strict: argv.strict === true,
    network: config.network,
    network_id: config.network_id
  }, function(err) {
    if (err) return done(err);

    Truffle.migrate.run({
      migrations_directory: config.migrations_directory,
      contracts_build_directory: config.contracts_build_directory,
      provider: config.provider,
      network: config.network,
      reset: argv.reset || false
    }, done);
  });
});

registerTask('exec', "Execute a JS file within truffle environment. Script *must* call process.exit() when finished.", function(done) {
  var config = Truffle.config.detect(environment, argv);

  var file = argv.file;

  if (file == null && argv._.length > 1) {
    file = argv._[1];
  }

  if (file == null) {
    console.log("Please specify a file, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished.");
    done();
    return;
  }

  if (path.isAbsolute(file) == false) {
    file = path.join(config.working_directory, file);
  }

  Truffle.require.exec({
    file: file,
    contracts_build_directory: config.contracts_build_directory,
    provider: config.provider
  });
});

// Supported options:
// --no-color: Disable color
// More to come.
registerTask('test', "Run tests", function(done) {
  environment = "test";
  var config = Truffle.config.detect(environment, argv);

  var files = [];

  if (argv.file) {
    files = [argv.file];
  } else if (argv._.length > 1) {
    Array.prototype.push.apply(files, argv._);
    files.shift(); // Remove "test"
  }

  if (files.length == 0) {
    files = filesSync(config.test_directory);
  }

  files = files.filter(function(file) {
    return file.match(config.test_file_extension_regexp) != null;
  });

  // if (files.length == 0) {
  //   return done(new Error("Cannot find any valid test files. Bailing."));
  // }

  temp.mkdir('test-', function(err, temporaryDirectory) {
    if (err) return done(err);

    function cleanup() {
      var args = arguments;
      // Ensure directory cleanup.
      temp.cleanup(function(err) {
        // Ignore cleanup errors.
        done.apply(null, args);
      });
    };

    // Copy all the built files over to a temporary directory, because we
    // don't want to save any tests artifacts.
    copy(config.contracts_build_directory, temporaryDirectory, function(err) {
      if (err) return done(err);

      Truffle.test.run({
        compileAll: argv.compileAll,
        contracts_directory: config.contracts_directory,
        contracts_build_directory: temporaryDirectory,
        migrations_directory: config.migrations_directory,
        test_files: files,
        network: "test",
        network_id: "default",
        provider: config.provider
      }, cleanup);
    });
  });
});

registerTask('console', "Run a console with deployed contracts instantiated and available (REPL)", function(done) {
  var config = Truffle.config.detect(environment, argv);
  Truffle.console.run({
    working_directory: config.working_directory,
    contracts_directory: config.contracts_directory,
    contracts_build_directory: config.contracts_build_directory,
    migrations_directory: config.migrations_directory,
    network: config.network,
    network_id: config.network_id,
    provider: config.provider,
    builder: config.build,
    build_directory: config.build_directory,
    processors: config.processors, // legacy option for default builder
    rpc: config.getRPCConfig()
  }, done);
});

registerTask('serve', "Serve app on localhost and rebuild changes as needed", function(done) {
  var config = Truffle.config.detect(environment, argv);
  Truffle.serve.start({
    build_directory: config.build_directory
  }, argv.p || argv.port || "8080", function() {
    runTask("watch");
  });
});

registerTask('networks', "Show addresses for deployed contracts on each network", function(done) {
  var config = Truffle.config.detect(environment, argv);
  Truffle.contracts.provision({
    contracts_build_directory: config.contracts_build_directory,
    provider: config.provider,
    network: config.network,
    network_id: config.network_id
  }, function(err, contracts) {
    if (err) return done(err);

    var ids_to_names = {};
    var networks = {};

    Object.keys(config.networks).forEach(function(network_name) {
      var network = config.networks[network_name];

      // Ignore the test network that's configured by default.
      if (network_name == "test" && network.network_id == null) {
        return;
      }

      var network_id = network.network_id || "default";
      ids_to_names[network_id] = network_name;
      networks[network_name] = [];
    });

    contracts.forEach(function(contract) {
      Object.keys(contract.all_networks).forEach(function(network_id) {
        var network_name = ids_to_names[network_id] || network_id;

        if (networks[network_name] == null) {
          networks[network_name] = [];
        }

        networks[network_name].push(contract);
      });
    });

    Object.keys(networks).sort().forEach(function(network_name) {

      console.log("")

      networks[network_name] = networks[network_name].sort(function(a, b) {
        a = a.contract_name;
        b = b.contract_name;
        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
      });

      var output = networks[network_name].map(function(contract) {
        if (contract.address == null) {
          return null;
        }

        return contract.contract_name + ": " + contract.address;
      }).filter(function(line) {
        return line != null;
      });

      if (output.length == 0) {
        output = ["No contracts deployed."];
      }

      console.log("Network: " + network_name);
      console.log("  " + output.join("\n  "))
    });

    console.log("");

    done();
  });
});

// Default to listing available commands.
var current_task = argv._[0];

if (current_task == null) {
  current_task = "list";
}

if (tasks[current_task] == null) {
  console.log(colors.red("Unknown command: " + current_task));
  process.exit(1);
}


    // // Check to see if we're working on a dapp meant for 0.2.x or older
    // if (fs.existsSync(path.join(working_dir, "config", "app.json"))) {
    //   console.log("Your dapp is meant for an older version of Truffle. Don't worry, there are two solutions!")
    //   console.log("");
    //   console.log("1) Upgrade you're dapp using the followng instructions (it's easy):");
    //   console.log("   https://github.com/ConsenSys/truffle/wiki/Migrating-from-v0.2.x-to-v0.3.0");
    //   console.log("");
    //   console.log("   ( OR )")
    //   console.log("");
    //   console.log("2) Downgrade to Truffle 0.2.x");
    //   console.log("");
    //   console.log("Cheers! And file an issue if you run into trouble! https://github.com/ConsenSys/truffle/issues")
    //   process.exit();
    // }

// Something is keeping the process open. I'm not sure what.
// Let's explicitly kill it until I can figure it out.
process.exit(runTask(current_task));
//runTask(current_task);
