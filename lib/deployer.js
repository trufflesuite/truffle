var EventEmitter = require("events").EventEmitter;
var inherits = require("util").inherits;
var Linker = require("./linker");

inherits(Deployer, EventEmitter);

function Deployer(options) {
  Deployer.super_.call(this);
  var self = this;
  options = options || {};
  this.chain = new Promise(function(accept, reject) {
    self._accept = accept;
    self._reject = reject;
  });
  this.logger = options.logger || console;
  if (options.quiet) {
    this.logger = {log: function() {}};
  }
  this.known_contracts = {};
  (options.contracts || []).forEach(function(contract) {
    self.known_contracts[contract.contract_name] = contract;
  })
  this.started = false;
};

// Note: In all code below we overwrite this.chain every time .then() is used
// in order to ensure proper error processing.

Deployer.prototype.start = function() {
  var self = this;
  return new Promise(function(accept, reject) {
    self.chain = self.chain.then(accept).catch(reject);
    self.started = true;
    self._accept();
  });
};

Deployer.prototype.autolink = function(contract) {
  this.checkStarted();

  var self = this;
  var regex = /__[^_]+_+/g;

  this.chain = this.chain.then(function() {
    Linker.autolink(contract, self.known_contracts, self.logger);
  });
};

Deployer.prototype.link = function(library, destinations) {
  this.checkStarted();

  var self = this;

  this.chain = this.chain.then(function() {
    Linker.link(library, destinations, self.logger);
  });
};

Deployer.prototype.deploy = function() {
  this.checkStarted();

  var self = this;
  var args = Array.prototype.slice.call(arguments);
  var contract = args.shift();

  self.chain = this.chain.then(function() {
    var prefix = "Deploying ";
    if (contract.address != null) {
      prefix = "Replacing ";
    }

    self.logger.log(prefix + contract.contract_name + "...");

    // Evaluate any arguments if they're promises
    return Promise.all(args);
  }).then(function(new_args) {
    return contract.new.apply(contract, new_args);
  }).then(function(instance) {
    self.logger.log("Saving deployed address: " + instance.address);
    contract.address = instance.address;
  });
  return self.chain;
};

Deployer.prototype.new = function() {
  this.checkStarted();

  var self = this;
  var args = Array.prototype.slice.call(arguments);
  var contract = args.shift();
  this.chain = this.chain.then(function() {
    self.logger.log("Creating new instance of " + contract.contract_name);
    // Evaluate any arguments if they're promises
    return Promise.all(args);
  }).then(function(new_args) {
    return contract.new.apply(contract, args)
  });
  return this.chain;
};

Deployer.prototype.then = function(fn) {
  this.checkStarted();

  var self = this;
  this.chain = this.chain.then(function() {
    self.logger.log("Running step...");
    return fn();
  });
  return this.chain;
}

Deployer.prototype.checkStarted = function() {
  if (this.started == true) {
    throw new Error("Can't add new deployment steps once the deploy has started");
  }
}

module.exports = Deployer;
