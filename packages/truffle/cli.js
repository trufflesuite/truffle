#!/usr/bin/env node
require("babel-register");

var web3 = require("web3");
var path = require("path");
var fs = require("fs");
var chokidar = require('chokidar');
var deasync = require("deasync");
var colors = require('colors/safe');
var Truffle = require('./index.js');

var ConfigurationError = require("./lib/errors/configurationerror");
var ExtendableError = require("./lib/errors/extendableerror");

var argv = require('yargs').argv;

var truffle_dir = process.env.TRUFFLE_NPM_LOCATION || argv.n || argv.npm_directory || __dirname;
var working_dir = process.env.TRUFFLE_WORKING_DIRECTORY || argv.w || argv.working_directory || process.cwd();

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
  var needs_redeploy = false;

  chokidar.watch(["app/**/*", "environments/*/contracts/**/*", "contracts/**/*", "truffle.json", "truffle.js"], {
    ignored: /[\/\\]\./, // Ignore files prefixed with "."
    cwd: working_dir,
    ignoreInitial: true
  }).on('all', function(event, filePath) {
    // On changed/added/deleted
    var display_path = path.join("./", filePath.replace(working_dir, ""));
    console.log(colors.cyan(">> File " + display_path + " changed."));

    needs_rebuild = true;

    if (display_path.indexOf("contracts/") == 0) {
      needs_redeploy = true;
    } else {
      needs_rebuild = true;
    }
  });

  var check_rebuild = function() {
    if (needs_redeploy == true) {
      needs_redeploy = false;
      needs_rebuild = false;
      console.log("Redeploying...");
      if (runTask("deploy") != 0) {
        printFailure();
      }
    }

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
  var config = Truffle.config.gather(truffle_dir, working_dir, argv);
  Truffle.init.all(config, done);
});

registerTask('create:contract', "Create a basic contract", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv);

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
  var config = Truffle.config.gather(truffle_dir, working_dir, argv);

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
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "development");
  Truffle.contracts.compile(config, done);
});

registerTask('deploy', "Deploy contracts to the network, compiling if needed", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "development");

  console.log("Using environment " + config.environment + ".");

  var compile = true;
  var link = true;

  if (argv.compile === false) {
    compile = false;
  }

  // Compile and deploy.
  Truffle.contracts.deploy(config, compile, function(err) {
    if (err != null) {
      done(err);
    } else {
      // console.log("Rebuilding app with new contracts...");
      // runTask("build");
      done();
    }
  });
});

registerTask('build', "Build development version of app", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "development");
  Truffle.build.build(config, function(err) {
    done(err);
    if (err == null) {
      printSuccess();
    }
  });
});

registerTask('dist', "Create distributable version of app (minified)", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "production");
  console.log("Using environment " + config.environment + ".");
  Truffle.build.dist(config, function(err) {
    done(err);
    if (err == null) {
      printSuccess();
    }
  });
});

registerTask('exec', "Execute a JS file within truffle environment. Script *must* call process.exit() when finished.", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "development");

  var file = argv.file;

  if (file == null && argv._.length > 1) {
    file = argv._[1];
  }

  if (file == null) {
    console.log("Please specify a file, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished.");
    done();
    return;
  }

  Truffle.exec.file(config, file, done);
});

// Supported options:
// --no-color: Disable color
// More to come.
registerTask('test', "Run tests", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "test");

  console.log("Using environment " + config.environment + ".");

  // Ensure we're quiet about deploys during tests.
  config.argv.quietDeploy = true;

  var file = argv.file;

  if (file == null && argv._.length > 1) {
    file = argv._[1];
  }

  if (file == null) {
    Truffle.test.run(config, done);
  } else {
    Truffle.test.run(config, file, done);
  }
});

registerTask('console', "Run a console with deployed contracts instantiated and available (REPL)", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "development");
  Truffle.console.run(config, done);
});

registerTask('serve', "Serve app on localhost and rebuild changes as needed", function(done) {
  var config = Truffle.config.gather(truffle_dir, working_dir, argv, "development");
  console.log("Using environment " + config.environment + ".");
  Truffle.serve.start(config, argv.port || argv.p || "8080", function() {
    runTask("watch");
  });
});



// registerTask('watch:tests', "Watch filesystem for changes and rerun tests automatically", function(done) {
//
//   gaze(["app/**/*", "config/**/*", "contracts/**/*", "test/**/*"], {cwd: working_dir, interval: 1000, debounceDelay: 500}, function() {
//     // On changed/added/deleted
//     this.on('all', function(event, filePath) {
//       if (filePath.match(/\/config\/.*?\/.*?\.sol\.js$/)) {
//         // ignore changes to /config/*/*.sol.js since these changes every time
//         // tests are run (when contracts are compiled)
//         return;
//       }
//       process.stdout.write("\u001b[2J\u001b[0;0H"); // clear screen
//       var display_path = "./" + filePath.replace(working_dir, "");
//       console.log(colors.cyan(">> File " + display_path + " changed."));
//       run_tests();
//     });
//   });
//
//   var run_tests = function() {
//     console.log("Running tests...");
//
//     process.chdir(working_dir);
//     var config = Truffle.config.gather(truffle_dir, working_dir, argv, "test");
//     config.argv.quietDeploy = true; // Ensure we're quiet about deploys during tests
//
//     Test.run(config, function() { console.log("> test run complete; watching for changes..."); });
//   };
//   run_tests(); // run once immediately
//
// });


// Default to listing available commands.
var current_task = argv._[0];

if (current_task == null) {
  current_task = "list";
}

if (tasks[current_task] == null) {
  console.log(colors.red("Unknown command: " + current_task));
  process.exit(1);
}

// Something is keeping the process open. I'm not sure what.
// Let's explicitly kill it until I can figure it out.
process.exit(runTask(current_task));
//runTask(current_task);
