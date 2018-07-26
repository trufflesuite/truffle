'use strict';

const exec = require('child_process').exec;
const path = require("path");
const { callbackify, promisify } = require("util");
const glob = promisify(require("glob"));
const fs = require("fs");
const expect = require("truffle-expect");
const debug = require("debug")("external-compile");

const runCompile = promisify(function (command, cwd, logger, callback) {
  const child = exec(command, { cwd });

  child.stdout.on('data', function(data) {
    data = data.toString().replace(/\n$/, '');
    logger.log(data);
  });

  child.stderr.on('data', function(data) {
    data = data.toString().replace(/\n$/, '');
    logger.log(data);
  });

  child.on('close', function(code) {
    // If the command didn't exit properly, show the output and throw.
    if (code !== 0) {
      var err = new Error("Unknown exit code: " + code);
      return callback(err);
    }

    callback();
  });
});

const compile = callbackify(async function(options) {
  if (options.logger == null) {
    options.logger = console;
  }

  expect.options(options, [
    "compilers",
    "working_directory"
  ]);
  expect.options(options.compilers, ["external"]);
  expect.options(options.compilers.external, [
    "command",
    "targets"
  ]);

  const { command, targets } = options.compilers.external;

  debug("running compile command: %s", command);
  await runCompile(command, options.working_directory, options.logger);

  const contracts = {};
  for (let target of targets) {
    const pattern = path.join(options.working_directory, target.path);
    for (let artifact of await glob( pattern, { follow: true })) {
      debug("processing artifact: %s", artifact);

      let contract = JSON.parse(fs.readFileSync(artifact));
      contracts[contract.contractName] = contract;
    }
  }

  return contracts;
});

compile.all = compile;
compile.necessary = compile;

module.exports = compile;
