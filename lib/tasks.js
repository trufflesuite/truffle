var Truffle = require('../index.js');
var path = require("path");
var dir = require("node-dir");
var temp = require("temp").track();
var fs = require("fs");
var copy = require("./copy");
var chokidar = require("chokidar");
var colors = require("colors");

var Tasks = {};

function createTask(name, description, fn) {
  Tasks[name] = function(options, done) {
    if (typeof options == "function") {
      done = options;
      options = {};
    }

    options.logger = options.logger || console;

    fn(options, done);
  };
  Tasks[name].description = description;
  Tasks[name].task_name = name;
};

createTask('list', "List all available tasks", function(options, done) {
  options.logger.log("Truffle v" + Truffle.version + " - a development framework for Ethereum");
  options.logger.log("");
  options.logger.log("Usage: truffle [command] [options]");
  options.logger.log("");
  options.logger.log("Commands:");
  options.logger.log("");

  var sorted = Object.keys(Tasks).sort();

  var longestTask = sorted.reduce(function(a, b) {
    var first = typeof a == "string" ? a.length : a;
    return Math.max(first, b.length);
  });

  for (var i = 0; i < sorted.length; i++) {
    var task = Tasks[sorted[i]];
    var heading = task.task_name;
    while (heading.length < longestTask) {
      heading += " ";
    }
    options.logger.log("  " + heading + " => " + task.description)
  }

  options.logger.log("");
  done();
});

createTask('version', "Show version number and exit", function(options, done) {
  options.logger.log("Truffle v" + Truffle.version);
  done();
});

createTask('init', "Initialize new Ethereum project, including example contracts and tests", function(options, done) {
  var config = Truffle.config.default();
  Truffle.init(config.working_directory, done);
});

createTask('create:contract', "Create a basic contract", function(options, done) {
  var config = Truffle.config.detect(options);

  var name = options.name;

  if (name == null && options._.length > 0) {
    name = options._[0];
  }

  if (name == null) {
    return done(new ConfigurationError("Please specify a name. Example: truffle create:contract MyContract"));
  } else {
    Truffle.create.contract(config.contracts_directory, name, done);
  }
});

createTask('create:test', "Create a basic test", function(options, done) {
  var config = Truffle.config.detect(options);

  var name = options.name;

  if (name == null && options._.length > 0) {
    name = options._[0];
  }

  if (name == null) {
    return done(new ConfigurationError("Please specify a name. Example: truffle create:test MyTest"));
  } else {
    Truffle.create.test(config.test_directory, name, done);
  }
});

createTask('create:migration', "Create a new migration marked with the current timestamp", function(options, done) {
  var config = Truffle.config.detect(options);

  var name = options.name;

  if (name == null && options._.length > 0) {
    name = options._[0];
  }

  Truffle.create.migration(config.migrations_directory, name, done);
});

createTask('compile', "Compile contracts", function(options, done) {
  var config = Truffle.config.detect(options);
  Truffle.contracts.compile(config, done);
});

createTask('build', "Build development version of app", function(options, done) {
  var config = Truffle.config.detect(options);
  Truffle.build.build(config.with({
    builder: config.build,
    processors: config.processors // legacy option for default builder
  }), done);
});

createTask('migrate', "Run migrations", function(options, done) {
  var config = Truffle.config.detect(options);

  Truffle.contracts.compile(config, function(err) {
    if (err) return done(err);
    Truffle.migrate.run(config, done);
  });
});

createTask('exec', "Execute a JS file within truffle environment", function(options, done) {
  var config = Truffle.config.detect(options);

  var file = options.file;

  if (file == null && options._.length > 0) {
    file = options._[0];
  }

  if (file == null) {
    options.logger.log("Please specify a file, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished.");
    done();
    return;
  }

  if (path.isAbsolute(file) == false) {
    file = path.join(process.cwd(), file);
  }

  Truffle.require.exec(config.with({
    file: file
  }), done);
});

// Supported options:
// --no-color: Disable color
// More to come.
createTask('test', "Run tests", function(options, done) {
  var config = Truffle.config.detect(options);
  config.network = "test";

  var files = [];

  if (options.file) {
    files = [options.file];
  } else if (options._.length > 0) {
    Array.prototype.push.apply(files, options._);
  }

  function getFiles(callback) {
    if (files.length != 0) {
      return callback(null, files);
    }

    dir.files(config.test_directory, callback);
  };

  getFiles(function(err, files) {
    files = files.filter(function(file) {
      return file.match(config.test_file_extension_regexp) != null;
    });

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

      function run() {
        Truffle.test.run(config.with({
          test_files: files,
          contracts_build_directory: temporaryDirectory
        }), cleanup);
      };

      // Copy all the built files over to a temporary directory, because we
      // don't want to save any tests artifacts. Only do this if the build directory
      // exists.
      fs.stat(config.contracts_build_directory, function(err, stat) {
        if (err) return run();

        copy(config.contracts_build_directory, temporaryDirectory, function(err) {
          if (err) return done(err);
          run();
        });
      });
    });
  });
});

createTask('console', "Run a console with deployed contracts instantiated and available (REPL)", function(options, done) {
  var config = Truffle.config.detect(options);

  var available_tasks = Object.keys(Tasks).filter(function(task_name) {
    return task_name != "console" && task_name != "init" && task_name != "watch" && task_name != "serve";
  });

  var tasks = {};
  available_tasks.forEach(function(task_name) {
    tasks[task_name] = Tasks[task_name];
  });

  Truffle.console.run(tasks, config.with({
    builder: config.build,
    processors: config.processors, // legacy option for default builder
  }), done);
});

createTask('serve', "Serve app on localhost and rebuild changes as needed", function(options, done) {
  var self = this;
  var config = Truffle.config.detect(options);
  Truffle.serve.start(config, function() {
    Tasks.watch(options, done);
  });
});

createTask('networks', "Show addresses for deployed contracts on each network", function(options, done) {
  var config = Truffle.config.detect(options);

  Truffle.profile.deployed_networks(config, function(err, networks) {
    if (err) return callback(err);

    Object.keys(networks).sort().forEach(function(network_name) {

      options.logger.log("")

      var output = Object.keys(networks[network_name]).sort().map(function(contract_name) {
        var address = networks[network_name][contract_name];
        return contract_name + ": " + address;
      });

      if (output.length == 0) {
        output = ["No contracts deployed."];
      }

      options.logger.log("Network: " + network_name);
      options.logger.log("  " + output.join("\n  "))
    });

    options.logger.log("");

    done();
  });
});

createTask('watch', "Watch filesystem for changes and rebuild the project automatically", function(options, done) {
  var config = Truffle.config.detect(options);

  var printSuccess = function() {
    options.logger.log(colors.green("Completed without errors on " + new Date().toString()));
  };

  var printFailure = function() {
    options.logger.log(colors.red("Completed with errors on " + new Date().toString()));
  };

  var needs_rebuild = true;

  var watchPaths = [
    path.join(config.working_directory, "app/**/*"),
    path.join(config.contracts_build_directory, "/**/*"),
    path.join(config.contracts_directory, "/**/*"),
    path.join(config.working_directory, "truffle.json"),
    path.join(config.working_directory, "truffle.js")
  ];

  chokidar.watch(watchPaths, {
    ignored: /[\/\\]\./, // Ignore files prefixed with "."
    cwd: config.working_directory,
    ignoreInitial: true
  }).on('all', function(event, filePath) {
    // On changed/added/deleted
    var display_path = path.join("./", filePath.replace(config.working_directory, ""));
    options.logger.log(colors.cyan(">> File " + display_path + " changed."));

    needs_rebuild = true;
  });

  var check_rebuild = function() {
    if (needs_rebuild == true) {
      needs_rebuild = false;
      options.logger.log("Rebuilding...");

      Tasks.build(options, function(err) {
        if (err) {
          printFailure();
        } else {
          printSuccess();
        }
        done(err);
      });
    }

    setTimeout(check_rebuild, 200);
  };

  check_rebuild();
});


module.exports = Tasks;
