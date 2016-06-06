var Linker = require("./linker");
var Require = require("./require");
var expect = require("./expect");
var path = require("path");
var DeferredChain = require("./deferredchain");

var Actions = {
  deployAndLink: function(contract, args, deployer) {
    var self = this;
    return function() {
      // Autolink the contract at deploy time.
      Linker.autolink(contract, deployer.known_contracts, deployer.logger);

      return self.deploy(contract, args, deployer)();
    }
  },

  deployAndLinkMany: function(arr, deployer) {
    return function() {
      // Perform all autolinking before deployment.
      arr.forEach(function(args) {
        var contract;

        if (Array.isArray(args)) {
          contract = args[0];
        } else {
          contract = args;
        }

        // Autolink the contract at deploy time.
        Linker.autolink(contract, deployer.known_contracts, deployer.logger);
      });

      var deployments = arr.map(function(args) {
        var contract;

        if (Array.isArray(args)) {
          contract = args.shift();
        } else {
          contract = args;
          args = [];
        }

        return Actions.deploy(contract, args, deployer)();
      });

      return Promise.all(deployments);
    };
  },

  deploy: function(contract, args, deployer) {
    return function() {
      var prefix = "Deploying ";
      if (contract.address != null) {
        prefix = "Replacing ";
      }

      deployer.logger.log(prefix + contract.contract_name + "...");

      // Evaluate any arguments if they're promises
      return Promise.all(args).then(function(new_args) {
        return contract.new.apply(contract, new_args);
      }).then(function(instance) {
        deployer.logger.log(contract.contract_name + ": " + instance.address);
        contract.address = instance.address;
      });
    };
  },

  autolink: function(contract, deployer) {
    return function() {
      Linker.autolink(contract, deployer.known_contracts, deployer.logger);
    };
  },

  link: function(library, destinations, deployer) {
    return function() {
      Linker.link(library, destinations, deployer.logger);
    };
  },

  new: function(contract, args, deployer) {
    return function() {
      self.logger.log("Creating new instance of " + contract.contract_name);
      // Evaluate any arguments if they're promises
      return Promise.all(args).then(function(new_args) {
        return contract.new.apply(contract, args)
      });
    };
  },

  exec: function(file, deployer) {
    return function() {
      if (path.isAbsolute(file) == false) {
        file = path.resolve(path.join(deployer.basePath, file));
      }

      deployer.logger.log("Running " + file + "...");
      // Evaluate any arguments if they're promises
      return new Promise(function(accept, reject) {
        Require.exec({
          file: file,
          contracts: Object.keys(deployer.known_contracts).map(function(key) {
            return deployer.known_contracts[key];
          }),
          network: deployer.network,
          network_id: deployer.network_id,
          provider: deployer.provider
        }, function(err) {
          if (err) return reject(err);
          accept();
        });
      });
    };
  }
};

function Deployer(options) {
  var self = this;
  options = options || {};

  expect.options(options, [
    "provider",
    "network",
    "network_id"
  ]);

  this.chain = new DeferredChain();
  this.logger = options.logger || console;
  if (options.quiet) {
    this.logger = {log: function() {}};
  }
  this.known_contracts = {};
  (options.contracts || []).forEach(function(contract) {
    self.known_contracts[contract.contract_name] = contract;
  });
  this.network = options.network;
  this.network_id = options.network_id;
  this.provider = options.provider;
  this.basePath = options.basePath || process.cwd();
};

// Note: In all code below we overwrite this.chain every time .then() is used
// in order to ensure proper error processing.

Deployer.prototype.start = function() {
  return this.chain.start();
};

Deployer.prototype.autolink = function(contract) {
  var self = this;

  // autolink all contracts available.
  if (contract == null) {
    Object.keys(this.known_contracts).forEach(function(contract_name) {
      self.autolink(self.known_contracts[contract_name]);
    });
    return;
  }

  this.queueOrExec(Actions.autolink(contract, self));
};

Deployer.prototype.link = function(library, destinations) {
  return this.queueOrExec(Actions.link(library, destinations, this));
};

Deployer.prototype.deploy = function() {
  var args = Array.prototype.slice.call(arguments);
  var contract = args.shift();

  if (Array.isArray(contract)) {
    return this.queueOrExec(Actions.deployAndLinkMany(contract, this));
  } else {
    return this.queueOrExec(Actions.deployAndLink(contract, args, this));
  }
};

Deployer.prototype.new = function() {
  var args = Array.prototype.slice.call(arguments);
  var contract = args.shift();

  return this.queueOrExec(Actions.new(contract, args, this));
};

Deployer.prototype.exec = function(file) {
  return this.queueOrExec(Actions.exec(file, this));
};

Deployer.prototype.then = function(fn) {
  var self = this;

  return this.queueOrExec(function() {
    self.logger.log("Running step...");
    return fn();
  });
};

Deployer.prototype.queueOrExec = function(fn) {
  var self = this;

  if (this.chain.started == true) {
    return new Promise(function(accept, reject) {
      accept();
    }).then(fn);
  } else {
    return this.chain.then(fn);
  }
};

module.exports = Deployer;
