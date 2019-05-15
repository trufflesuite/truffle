"use strict";

const debug = require("debug")("external-compile");
const { exec, execSync } = require("child_process");
const resolve = require("path").resolve;
const { callbackify, promisify } = require("util");
const glob = promisify(require("glob"));
const fs = require("fs");
const expect = require("truffle-expect");
const Schema = require("truffle-contract-schema");
const web3 = {};
web3.utils = require("web3-utils");

const DEFAULT_ABI = [
  {
    payable: true,
    stateMutability: "payable",
    type: "fallback"
  }
];

/**
 * buffer a line of data, yielding each full line
 *
 * returned generator alternates between two states:
 * 1. reset
 * 2. read/write
 *
 * usage:
 *
 *   let gen = bufferLines();
 *
 *   // first reset
 *   gen.next(); // reset
 *
 *   // pass string data with zero or more new lines
 *   // or pass `null` to signal EOF
 *   let { value, done } = gen.next(data);
 *
 *   // if done, value possibly contains string value with unterminated output
 *   // otherwise, value contains any/all complete lines
 */
function* bufferLines() {
  let buffer = [];

  while (true) {
    // read input string or null as eof
    const input = yield;

    // eof returns buffer
    if (input == null) {
      const unterminated = buffer.join("");

      return unterminated ? [`${unterminated}%`] : [];
    }

    // split lines
    // last element is always partial line
    const data = input.split("\n");

    // add first element to buffer
    let [first] = data.slice(0);
    buffer.push(first);

    if (data.length > 1) {
      // split off partial line to save as new buffer
      const [last] = data.slice(-1);
      const [...middle] = data.slice(1, -1);

      // use buffer as first element (now complete line)
      // and yield all complete lines
      const lines = [buffer.join(""), ...middle];
      yield lines;

      // reset buffer
      buffer = [last];
    } else {
      // nothing to see yet
      yield [];
    }
  }
}

/**
 * run a command, forwarding data to arbitrary logger.
 * invokes callback when process exits, error on nonzero exit code.
 */
const runCommand = promisify(function(command, options, callback) {
  const { cwd, logger, input } = options;
  const child = exec(command, { cwd, input });

  // wrap buffer generator for easy use
  const buffer = func => {
    const gen = bufferLines();

    return data => {
      gen.next();

      let { value: lines } = gen.next(data);
      for (let line of lines) {
        func(line);
      }
    };
  };

  const log = buffer(logger.log);
  const warn = buffer(logger.warn || logger.log);

  child.stdout.on("data", data => log(data.toString()));
  child.stderr.on("data", data => warn(data.toString()));

  child.on("close", function(code) {
    // close streams to flush unterminated lines
    log(null);
    warn(null);

    // If the command didn't exit properly, show the output and throw.
    if (code !== 0) {
      var err = new Error("Unknown exit code: " + code);
      return callback(err);
    }

    callback();
  });
});

/**
 * identify and process contents as one of:
 * 1. JSON literal
 * 2. Hex string
 * 3. Raw binary data
 */
function decodeContents(contents) {
  // JSON
  try {
    return JSON.parse(contents);
  } catch (e) {
    /* no-op */
  }

  // hex string
  if (contents.toString().startsWith("0x")) {
    return contents.toString();
  }

  // raw binary
  return web3.utils.bytesToHex(contents);
}

async function processTargets(targets, cwd, logger) {
  const contracts = {};
  for (let target of targets) {
    let targetContracts = await processTarget(target, cwd, logger);
    for (let [name, contract] of Object.entries(targetContracts)) {
      contracts[name] = Schema.validate(contract);
    }
  }

  return contracts;
}

async function processTarget(target, cwd, logger) {
  const usesPath = target.path != undefined;
  const usesCommand = target.command != undefined;
  const usesStdin = target.stdin || target.stdin == undefined; // default true
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

    const output = usesCommand ? execSync(command, execOptions) : input;

    const contract = JSON.parse(output);
    return { [contract.contractName]: contract };
  }

  if (usesPath && glob.hasMagic(target.path)) {
    // glob expression, recurse after expansion
    let paths = await glob(target.path, { cwd, follow: true });
    // copy target properties, overriding path with expanded form
    let targets = paths.map(path => Object.assign({}, target, { path }));
    return await processTargets(targets, cwd, logger);
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

    if (!contract.bytecode && logger) {
      logger.log(
        "Warning: contract " +
          contract.contractName +
          " does not specify bytecode. You won't be able to deploy it."
      );
    }

    return { [contract.contractName]: contract };
  }
}

const compile = callbackify(async function(options) {
  if (options.logger == null) {
    options.logger = console;
  }

  expect.options(options, ["compilers"]);
  expect.options(options.compilers, ["external"]);
  expect.options(options.compilers.external, ["command", "targets"]);

  const { command, targets } = options.compilers.external;
  const cwd =
    options.compilers.external.workingDirectory ||
    options.compilers.external.working_directory || // just in case
    options.working_directory;
  const logger = options.logger;

  debug("running compile command: %s", command);
  await runCommand(command, { cwd, logger });

  return await processTargets(targets, cwd, logger);
});

// required public interface
compile.all = compile;
compile.necessary = compile;

// specific exports
compile.DEFAULT_ABI = DEFAULT_ABI;
compile.processTarget = processTarget;

module.exports = compile;
