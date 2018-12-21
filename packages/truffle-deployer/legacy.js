var expect = require("truffle-expect");
var DeferredChain = require("./src/deferredchain");
var deploy = require("./src/actions/deploy");
var deployMany = require("./src/actions/deploymany");
var link = require("./src/actions/link");
var create = require("./src/actions/new");

function LegacyDeployer(options = {}) {
  var self = this;

  expect.options(options, ["provider", "network", "network_id"]);

  this.chain = new DeferredChain();
  this.logger = options.logger || { log: function() {} };
  this.known_contracts = {};
  (options.contracts || []).forEach(function(contract) {
    self.known_contracts[contract.contract_name] = contract;
  });
  this.network = options.network;
  this.network_id = options.network_id;
  this.provider = options.provider;
  this.basePath = options.basePath || process.cwd();
}

// Note: In all code below we overwrite this.chain every time .then() is used
// in order to ensure proper error processing.

LegacyDeployer.prototype.start = function() {
  return this.chain.start();
};

LegacyDeployer.prototype.link = function(library, destinations) {
  return this.queueOrExec(link(library, destinations, this)); //legacyLink(library, destinations, this));
};

LegacyDeployer.prototype.deploy = function() {
  var args = Array.prototype.slice.call(arguments);
  var contract = args.shift();

  if (Array.isArray(contract)) {
    return this.queueOrExec(deployMany(contract, this));
  } else {
    return this.queueOrExec(deploy(contract, args, this));
  }
};

LegacyDeployer.prototype.new = function() {
  var args = Array.prototype.slice.call(arguments);
  var contract = args.shift();

  return this.queueOrExec(create(contract, args, this));
};

LegacyDeployer.prototype.exec = function() {
  throw new Error(
    "deployer.exec() has been deprecated; please seen the truffle-require package for integration."
  );
};

LegacyDeployer.prototype.then = function(fn) {
  var self = this;

  return this.queueOrExec(function() {
    self.logger.log("Running step...");
    return fn(this);
  });
};

LegacyDeployer.prototype.queueOrExec = function(fn) {
  var self = this;

  if (this.chain.started == true) {
    return new Promise(function(accept) {
      accept();
    }).then(fn);
  } else {
    return this.chain.then(fn);
  }
};

module.exports = LegacyDeployer;
