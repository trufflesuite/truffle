const expect = require("@truffle/expect");
const Emittery = require("emittery");
const DeferredChain = require("./src/deferredchain");
const Deployment = require("./src/deployment");
const link = require("./src/actions/link");
const create = require("./src/actions/new");
const ENS = require("./ens");

class Deployer extends Deployment {
  constructor({
    options,
    logger,
    basePath
  }) {
    options = options || {};
    expect.options(options, ["provider", "networks", "network", "network_id"]);

    const emitter = new Emittery();
    super(emitter, options);

    this.options = options;
    this.emitter = emitter;
    this.chain = new DeferredChain();
    this.logger = logger || { log: function () {} };
    this.network = options.network;
    this.networks = options.networks;
    this.network_id = options.network_id;
    this.provider = options.provider;
    this.basePath = basePath || process.cwd();
    this.known_contracts = {};
    if (options.ens && options.ens.enabled) {
      options.ens.registryAddress = this.networks[this.network].registry
        ? this.networks[this.network].registry.address
        : null;
      this.ens = new ENS({
        provider: options.provider,
        networkId: options.network_id,
        ens: options.ens
      });
    }

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

    return this.queueOrExec(this.executeDeployment(contract, args, this));
  }

  new() {
    const args = Array.prototype.slice.call(arguments);
    const contract = args.shift();

    return this.queueOrExec(create(contract, args, this));
  }

  then(fn) {
    return this.queueOrExec(function () {
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
