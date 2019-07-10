const expect = require("truffle-expect");
const Emittery = require("emittery");
const DeferredChain = require("./src/deferredchain");
const Deployment = require("./src/deployment");
const link = require("./src/actions/link");
const create = require("./src/actions/new");
const Legacy = require("truffle-legacy-system");
const { getLegacyNetworkTypes } = require("truffle-interface-adapter");

class Deployer extends Deployment {
  constructor(options) {
    options = options || {};
    expect.options(options, ["provider", "networks", "network", "network_id"]);

    const emitter = new Emittery();
    super(emitter, options);

    this.emitter = emitter;
    this.chain = new DeferredChain();
    this.logger = options.logger || { log: function() {} };
    this.network = options.network;
    this.networks = options.networks;
    this.network_id = options.network_id;
    this.provider = options.provider;
    this.basePath = options.basePath || process.cwd();
    this.known_contracts = {};

    (options.contracts || []).forEach(
      contract => (this.known_contracts[contract.contract_name] = contract)
    );
  }

  // Note: In all code below we overwrite this.chain every time .then() is used
  // in order to ensure proper error processing.
  start() {
    return this.chain.start();
  }

  link(library, destinations) {
    return this.queueOrExec(link(library, destinations, this));
  }

  deploy() {
    const args = Array.prototype.slice.call(arguments);
    const contract = args.shift();
    const networkType = this.networks[this.network].type;

    if (networkType && getLegacyNetworkTypes().includes(networkType)) {
      if (Array.isArray(contract))
        return this.queueOrExec(Legacy.deployMany(contract, this));
      else return this.queueOrExec(Legacy.deploy(contract, args, this));
    }

    return this.queueOrExec(this.executeDeployment(contract, args, this));
  }

  new() {
    const args = Array.prototype.slice.call(arguments);
    const contract = args.shift();

    return this.queueOrExec(create(contract, args, this));
  }

  then(fn) {
    return this.queueOrExec(function() {
      return fn(this);
    });
  }

  queueOrExec(fn) {
    return this.chain.started == true
      ? new Promise(accept => accept()).then(fn)
      : this.chain.then(fn);
  }

  finish() {
    this.emitter.clearListeners();
    this.close();
  }
}

module.exports = Deployer;
