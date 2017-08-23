var repl = require("repl");
var Command = require("./command");
var provision = require("truffle-provisioner");
var contract = require("truffle-contract");
var Web3 = require("web3");
var vm = require("vm");
var expect = require("truffle-expect");
var _ = require("lodash");
var TruffleError = require("truffle-error");
var fs = require("fs");
var os = require("os");
var path = require("path");
var stream = require("stream");
var async = require("async");

function ReplManager(options) {
  expect.options(options, [
    "working_directory",
    "contracts_directory",
    "contracts_build_directory",
    "migrations_directory",
    "network",
    "network_id",
    "provider",
    "resolver",
    "build_directory"
  ]);

  this.options = options;
  this.repl = options.repl;

  this.contexts = [];
};

ReplManager.prototype.start = function(options, callback) {
  var self = this;

  this.contexts.push({
    prompt: options.prompt,
    interpreter: options.interpreter,
    context: options.context || {},
    done: callback
  });

  var currentContext = this.contexts[this.contexts.length - 1];

  if (!this.repl) {
    this.repl = repl.start({
      prompt: currentContext.prompt,
      eval: this.interpret.bind(this),
    });

    this.repl.on("exit", function() {
      var doneFunctions = self.contexts.map(function(context) {
        return context.done || function() {};
      });
      async.series(doneFunctions, function(err) {
        // What do we do if we error here?
      });
    });
  }

  this.repl.setPrompt(options.prompt);
  //this.repl.context = currentContext.context;
};

ReplManager.prototype.stop = function(callback) {
  this.popContext(callback);
};

ReplManager.prototype.setContextVars = function(obj) {
  var self = this;
  if (this.repl) {
    Object.keys(obj).forEach(function(key) {
      self.repl.context[key] = obj[key];
    });
  }
};

ReplManager.prototype.popContext = function(callback) {
  var oldContext = this.contexts.pop();

  if (oldContext.done) {
    oldContext.done();
  }

  var currentContext = this.contexts[this.contexts.length - 1];

  if (currentContext) {
    this.repl.setPrompt(currentContext.prompt);
  }
  //this.repl.context = currentContext.context;

  if (callback) {
    callback();
  }
};

ReplManager.prototype.interpret = function(cmd, context, filename, callback) {
  var currentContext = this.contexts[this.contexts.length - 1];
  currentContext.interpreter(cmd, context, filename, callback);
}

module.exports = ReplManager;
