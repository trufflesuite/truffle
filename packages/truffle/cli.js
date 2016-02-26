// This file exists for two reasons:
// 1. To run babel-node correctly based on platform
// 2. To massage arguments that babel-node clobbers (see below)

var path = require("path");
var spawn = require("child_process").spawn;

var isWin = /^win/.test(process.platform);

var cli_path = path.resolve(path.join(__dirname, "./truffle.es6"));
var babel_path = path.resolve(path.join(__dirname, "./node_modules/.bin/babel-node"));

if (isWin) {
  babel_path += ".cmd";
}

// Prepare arguments for babel-node
var args = [cli_path];
Array.prototype.push.apply(args, process.argv.slice(2));

// bable-node clobbers -e, so let's explicitly change it here
for (var i = 0; i < args.length; i++) {
  if (args[i] == "-e") {
    args[i] = "--environment";
  }
}

var cmd = spawn(babel_path, args);

cmd.stdout.on('data', (data) => {
  console.log(data.toString());
});

cmd.stderr.on('data', (data) => {
  console.error(data.toString());
});

cmd.on('close', (code) => {
  process.exit(code);
})

cmd.on('error', function(err) {
  throw err;
});
