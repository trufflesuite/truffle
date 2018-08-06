'use strict';

const debug = require("debug")("external-compile");
const { exec, execSync } = require('child_process');
const resolve = require("path").resolve;
const { callbackify, promisify } = require("util");
const glob = promisify(require("glob"));
const fs = require("fs");
const expect = require("truffle-expect");
const web3 = {};
web3.utils = require("web3-utils");

const DEFAULT_ABI = [{
  payable: true,
  stateMutability: "payable",
  type: "fallback"
}];

const runCommand = promisify(function (command, options, callback) {
  const { cwd, logger, input } = options;
  const child = exec(command, { cwd, input });

  child.stdout.on('data', function(data) {
    data = data.toString().replace(/(\r|\n)+$/, '');
    logger.log(data);
  });

  child.stderr.on('data', function(data) {
    data = data.toString().replace(/(\r|\n)+$/, '');
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

function decodeContents (contents) {
  // HACK to test if contents has binary data
  // from https://stackoverflow.com/a/49773659
  if (/\ufffd/.test(contents.toString())) {
    return web3.utils.bytesToHex(contents);
  }

  try {
    return JSON.parse(contents);
  } catch (e) {
    return contents;
  }

}

async function processTargets (targets, cwd) {
  const contracts = {};
  for (let target of targets) {
    let targetContracts = await processTarget(target, cwd);
    for (let [name, contract] of Object.entries(targetContracts)) {
      contracts[name] = contract;
    }
  }

  return contracts;
}

async function processTarget (target, cwd) {
  const usesPath = target.path != undefined;
  const usesCommand = target.command != undefined;
  const usesStdin = target.stdin || target.stdin == undefined;  // default true
  const usesProperties = target.properties || target.fileProperties;

  if (usesProperties && usesPath) {
    throw new Error(
      "External compilation target cannot define both properties and path"
    );
  }

  if (usesProperties && usesCommand) {
    throw new Error(
      "External compilation target cannot define both properties and command"
    );
  }


  if (usesCommand && !usesPath) {
    // just run command
    const output = execSync(target.command, { cwd });
    const contract = JSON.parse(output);
    return { [contract.contractName]: contract };
  }

  if (usesPath && !glob.hasMagic(target.path)) {
    // individual file
    const filename = resolve(cwd, target.path);
    let input, command, execOptions;
    if (usesStdin) {
      input = fs.readFileSync(filename).toString();
      command = target.command;
      execOptions = { cwd, input };
    } else {
      command = `${target.command} ${filename}`;
      execOptions = { cwd };
    }

    const output = (usesCommand)
      ? execSync(command, execOptions)
      : input;

    const contract = JSON.parse(output);
    return { [contract.contractName]: contract };
  }

  if (usesPath && glob.hasMagic(target.path)) {
    // glob expression, recurse after expansion
    let paths = await glob(target.path, { cwd, follow: true });
    // copy target properties, overriding path with expanded form
    let targets = paths.map(path => Object.assign({}, target, { path }));
    return await processTargets(targets, cwd);
  }

  if (usesProperties) {
    // contract properties listed individually
    const contract = Object.assign({}, target.properties || {});

    for (let [key, path] of Object.entries(target.fileProperties || {})) {
      const contents = fs.readFileSync(resolve(cwd, path));
      const value = decodeContents(contents);

      contract[key] = value;
    }

    if (!contract.contractName) {
      throw new Error("External compilation target must specify contractName");
    }

    if (!contract.abi) {
      contract.abi = DEFAULT_ABI;
    }

    return { [contract.contractName]: contract };
  }
}

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

  return await processTargets(targets, cwd);
});

// required public interface
compile.all = compile;
compile.necessary = compile;

// specific exports
compile.DEFAULT_ABI = DEFAULT_ABI;
compile.processTarget = processTarget;

module.exports = compile;
