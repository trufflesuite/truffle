'use strict';

const { exec, execSync } = require('child_process');
const path = require("path");
const { callbackify, promisify } = require("util");
const glob = promisify(require("glob"));
const fs = require("fs");
const expect = require("truffle-expect");
const debug = require("debug")("external-compile");

const runCommand = promisify(function (command, options, callback) {
  const { cwd, logger, input } = options;
  const child = exec(command, { cwd, input });

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
  const cwd = options.working_directory;
  const logger = options.logger;

  debug("running compile command: %s", command);
  await runCommand(command, { cwd, logger });

  const contracts = {};
  for (let target of targets) {
    expect.one(target, [ "path", "command" ]);  // also allows both

    if (target.path != undefined) {
      const pattern = path.join(cwd, target.path);

      for (let preprocessed of await glob( pattern, { follow: true })) {
        debug("processing target: %s", preprocessed);
        const input = fs.readFileSync(preprocessed).toString();

        const output = (target.command)
          ? execSync(target.command, { cwd, input })
          : input;
        const contract = JSON.parse(output);
        contracts[contract.contractName] = contract;
      }
    } else {
      const output = execSync(target.command, { cwd });
      const contract = JSON.parse(output);
      contracts[contract.contractName] = contract;
    }
  }

  return contracts;
});

compile.all = compile;
compile.necessary = compile;

module.exports = compile;
