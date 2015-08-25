#!/usr/bin/env ./node_modules/.bin/babel-node
var web3 = require("web3");
var path = require("path");
var fs = require("fs");
var watchr = require("watchr");
var deasync = require("deasync");
var colors = require('colors/safe');
var Init = require("./lib/init");
var Create = require("./lib/create");
var Config = require("./lib/config");
var Contracts = require("./lib/contracts");
var Build = require("./lib/build");
var Test = require("./lib/test");
var Exec = require("./lib/exec");
var Repl = require("./lib/repl");

var ConfigurationError = require("./lib/errors/configurationerror");

var truffle_dir = process.env.TRUFFLE_NPM_LOCATION;
var working_dir = process.env.TRUFFLE_WORKING_DIRECTORY;

var argv = require('yargs').argv;
var pkg = JSON.parse(fs.readFileSync(path.join(truffle_dir, "package.json"), {encoding: "utf8"}));

var tasks = {};
var registerTask = function(name, description, fn) {
  tasks[name] = {
    name: name,
    description: description,
    fn: fn
  };
}

var runTask = function(task, args) {
  if (args == null) {
    args = [];
  }

  // TODO: Handle all errors gracefully.
  var fn = deasync(tasks[task].fn);

  try {
    fn.apply(null, args);
    return 0;
  } catch (e) {
    if (e instanceof ConfigurationError) {
      console.log(colors.red(e.message));
    } else {
      // Bubble up all other unexpected errors.
      console.log(e.stack);
    }
    return 1;
  }
};

registerTask('watch', "Watch filesystem for changes and rebuild the project automatically", function(done) {
  var needs_rebuild = true;

  watchr.watch({
    paths: [
      path.join(working_dir, "app"),
      path.join(working_dir, "config"),
      path.join(working_dir, "contracts")
    ],
    next: function() {
      console.log("Watching...")
    },
    listener: function(changeType, filePath, fileCurrentStat, filePreviousStat) {
      var display_path = "./" + filePath.replace(working_dir, "");
      console.log(colors.cyan(`>> File ${display_path} changed.`));
      needs_rebuild = true;
    },
    persistent: true,
    interval: 100, // use values from grunt-contrib-watch
    catchupDelay: 500
  });

  var check_rebuild = function() {
    if (needs_rebuild == true) {
      needs_rebuild = false;
      console.log("Rebuilding...");
      if (runTask("build") == 0) {
        console.log(colors.green(`Completed without errors on ${new Date().toString()}`));
      } else {
        console.log(colors.red(`Error during build. See above.`));
      }
    }
    setTimeout(check_rebuild, 500);
  };

  setInterval(check_rebuild, 500);
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
});

registerTask('version', "Show version number and exit", function(done) {
  console.log("Truffle v" + pkg.version);
});

registerTask('init', "Initialize new Ethereum project, including example contracts and tests", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv);
  Init.all(config, done);
});

registerTask('init:contracts', "Initialize default contracts directory", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv);
  Init.contracts(config, done);
});

registerTask('init:config', "Initialize default project configuration", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv);
  Init.config(config, done);
});

registerTask('init:tests', "Initialize tests directory structure and helpers", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv);
  Init.tests(config, done);
});

registerTask('create:contract', "Create a basic contract", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv);
  try {
    if (typeof argv.name != "string") {
      console.log("Please specify --name. Example: truffle create:contract --name 'MyContract'");
    } else {
      Create.contract(config, argv.name, done);
    }
  } catch(e) {
    console.log(e.stack);
  }
});

registerTask('create:test', "Create a basic test", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv);
  try {
    if (typeof argv.name != "string") {
      console.log("Please specify --name. Example: truffle create:test --name 'MyContract'");
    } else {
      Create.test(config, argv.name, done);
    }
  } catch(e) {
    console.log(e.stack);
  }
});

registerTask('compile', "Compile contracts", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "development");
  Contracts.compile(config, done);
});

registerTask('deploy', "Deploy contracts to the network", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "development");

  console.log("Using environment " + config.environment + ".");

  // Compile and deploy.
  Contracts.deploy(config, true, function(err) {
    if (err != null) {
      done(err);
    } else {
      runTask("build");
      done();
    }
  });
});

registerTask('build', "Build development version of app; creates ./build directory", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "development");
  Build.build(config, done);
});

registerTask('dist', "Create distributable version of app (minified); creates ./dist directory", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "production");
  console.log("Using environment " + config.environment + ".");
  Build.dist(config, done);
});

registerTask('exec', "Execute a Coffee/JS file within truffle environment. Script *must* call process.exit() when finished.", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "development");

  if (typeof argv.file != "string") {
    console.log("Please specify --file option, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished.");
    done();
    return;
  }

  Exec.file(config, argv.file);
});

// Supported options:
// --no-color: Disable color
// More to come.
registerTask('test', "Run tests", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "test");

  console.log("Using environment " + config.environment + ".");

  // Ensure we're quiet about deploys during tests.
  config.argv.quietDeploy = true;

  Test.run(config, done);
});

registerTask('console', "Run a console with deployed contracts instanciated and available (REPL)", function(done) {
  var config = Config.gather(truffle_dir, working_dir, argv, "development");
  Repl.run(config, done);
});

// Default to listing available commands.
var current_task = argv._[0];

if (current_task == null) {
  current_task = "list";
}

if (tasks[current_task] == null) {
  throw new Error("Unknown command: " + current_task);
}

// Something is keeping the process open. I'm not sure what.
// Let's explicitly kill it until I can figure it out.
process.exit(runTask(current_task));
//runTask(current_task);
