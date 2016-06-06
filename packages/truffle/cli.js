#!/usr/bin/env node
require("babel-register")({
    "presets": ["es2015", "stage-2"]
})
require("babel-polyfill")

var Command = require("./lib/command");
var Tasks = require("./lib/tasks");
var TaskError = require("./lib/errors/taskerror");
var ExtendableError = require("./lib/errors/extendableerror");

var command = new Command(Tasks);
command.run(process.argv.slice(2), function(err) {
  if (err) {
    if (err instanceof TaskError) {
      command.run("list", function() {});
    } else {
      if (err instanceof ExtendableError) {
        console.log(err.message);
      } else {
        // Bubble up all other unexpected errors.
        console.log(err.stack || err.toString());
      }
    }
  }
});

//var environment = argv.e || argv.environment || process.env.NODE_ENV || "default";
//
// if (working_dir[working_dir.length - 1] != "/") {
//   working_dir += "/";
// }
//
// var printNetwork = function() {
//   console.log("Using network " + environment + ".");
// };
//
// var printSuccess = function() {
//   console.log(colors.green("Completed without errors on " + new Date().toString()));
// };
//
// var printFailure = function() {
//   console.log(colors.red("Completed with errors on " + new Date().toString()));
// };
//
//




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
