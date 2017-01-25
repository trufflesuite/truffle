var expect = require("truffle-expect");
var EthPM = require("ethpm");
var EthPMRegistry = require("ethpm-registry");
var Web3 = require("web3");
var async = require("async");
var dir = require("node-dir");
var path = require("path");
var fs = require('fs');

var Package = {
  install: function(options, callback) {
    expect.options(options, [
      "working_directory",
      "ethpm"
    ]);

    expect.options(options.ethpm, [
      "registry",
      "ipfs_host",
      "install_provider_uri"
    ]);

    // ipfs_port and ipfs_protocol are optinal.

    var provider = new Web3.providers.HttpProvider(options.ethpm.install_provider_uri);
    var web3 = new Web3(provider);
    var host = options.ethpm.host;

    if ((host instanceof EthPM.hosts.IPFS) == false) {
      host = new EthPM.hosts.IPFS(options.ethpm.ipfs_host, options.ethpm.ipfs_port, options.ethpm.ipfs_protocol);
    }

    var fakeAddress = "0x1234567890123456789012345678901234567890";

    var registry = options.ethpm.registry;

    if (typeof registry == "string") {
      registry = EthPMRegistry.use(options.ethpm.registry, fakeAddress, provider);
    }

    var pkg = new EthPM(options.working_directory, host, registry);

    if (options.packages) {
      var chain = Promise.resolve();

      options.packages.forEach(function(package_name) {
        // TODO: Support versions
        chain.then(function() {
          return pkg.installDependency(package_name, "*");
        }).catch(callback);
      });

      chain.then(function() {
        callback();
      })
    } else {
      fs.access(path.join(options.working_directory, "epm.json"), fs.constants.R_OK, function(err) {
        var manifest;

        // If the epm.json file doesn't exist, use the config as the manifest.
        if (err) {
          manifest = options;
        }

        pkg.install(manifest).then(function() {
          callback();
        }).catch(callback);
      });
    }
  },

  publish: function(options, callback) {
    expect.options(options, [
      "ethpm",
      "contracts_directory"
    ]);

    expect.options(options.ethpm, [
      "registry",
      "host"
    ]);

    var provider = options.provider;
    var web3 = new Web3(provider);
    var host = new EthPM.hosts.IPFS(options.ethpm.host.host, options.ethpm.host.port);

    web3.eth.getAccounts(function(err, accs) {
      if (err) return callback(err);

      var registry = EthPMRegistry.use(options.ethpm.registry, accs[0], provider);
      var pkg = new EthPM(options.working_directory, host, registry);

      pkg.publish().then(callback).catch(callback);
    });
  },

  digest: function(options, callback) {
    // async.parallel({
    //   contracts: provision.bind(provision, options, false),
    //   files: dir.files.bind(dir, options.contracts_directory)
    // }, function(err, results) {
    //   if (err) return callback(err);
    //
    //   results.contracts = results.contracts.map(function(contract) {
    //     return contract.contract_name;
    //   });
    //
    //   callback(null, results);
    // });
    callback(new Error("Not yet implemented"));
  }
};

module.exports = Package;
