#!/usr/bin/env node
var path = require("path");
var spawn = require("child_process").spawn;

var cli_path = path.resolve(path.join(__dirname, "./cli.js"));

var args = [
  cli_path,
  "exec"
];

Array.prototype.push.apply(args, process.argv.slice(2));

var cmd = spawn("node", args);

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
