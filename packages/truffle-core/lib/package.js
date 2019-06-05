const expect = require("truffle-expect");
const TruffleError = require("truffle-error");
const Networks = require("./networks");
const EthPM = require("ethpm");
const EthPMRegistry = require("ethpm-registry");
const Web3 = require("web3");
const Web3Shim = require("truffle-interface-adapter").Web3Shim;
const async = require("async");
const path = require("path");
const fs = require("fs");
const OS = require("os");

const Package = {
  install: async function(options, callback) {
    expect.options(options, ["working_directory", "ethpm"]);

    expect.options(options.ethpm, ["registry", "ipfs_host"]);

    expect.one(options.ethpm, ["provider", "install_provider_uri"]);

    // ipfs_port and ipfs_protocol are optinal.

    const provider =
      options.ethpm.provider ||
      new Web3.providers.HttpProvider(options.ethpm.install_provider_uri, {
        keepAlive: false
      });
    let host = options.ethpm.ipfs_host;

    if (host instanceof EthPM.hosts.IPFS === false) {
      host = new EthPM.hosts.IPFSWithLocalReader(
        options.ethpm.ipfs_host,
        options.ethpm.ipfs_port,
        options.ethpm.ipfs_protocol
      );
    }

    // When installing, we use infura to make a bunch of eth_call's.
    // We don't make any transactions. To satisfy APIs we'll put a from address,
    // but it doesn't really matter in this case.
    const fakeAddress = "0x1234567890123456789012345678901234567890";

    let registry = options.ethpm.registry;

    if (typeof registry === "string") {
      registry = await EthPMRegistry.use(
        options.ethpm.registry,
        fakeAddress,
        provider
      );
    }

    const pkg = new EthPM(options.working_directory, host, registry);

    if (options.packages) {
      const promises = options.packages.map(package_name => {
        const pieces = package_name.split("@");
        package_name = pieces[0];

        let version = "*";

        if (pieces.length > 1) version = pieces[1];

        return pkg.installDependency(package_name, version);
      });

      Promise.all(promises)
        .then(() => {
          if (options.packages.length > 0) {
            console.log("");
            console.log("Successfully installed the following package(s)...");
            console.log("==================================================");
            options.packages.forEach(singlePackage => {
              console.log(`> ${singlePackage}`);
            });
            console.log("");
          }
          callback();
        })
        .catch(callback);
    } else {
      fs.access(
        path.join(options.working_directory, "ethpm.json"),
        fs.constants.R_OK,
        error => {
          let manifest;

          // If the ethpm.json file doesn't exist, use the config as the manifest.
          if (error) manifest = options;

          pkg
            .install(manifest)
            .then(() => {
              callback();
            })
            .catch(callback);
        }
      );
    }
  },

  publish: function(options, callback) {
    var self = this;

    expect.options(options, [
      "ethpm",
      "working_directory",
      "contracts_directory",
      "networks"
    ]);

    expect.options(options.ethpm, ["registry", "ipfs_host"]);

    // ipfs_port and ipfs_protocol are optinal.

    // When publishing, you need a ropsten network configured.
    var ropsten = options.networks.ropsten;

    if (!ropsten) {
      return callback(
        new TruffleError(
          "You need to have a `ropsten` network configured in order to publish to the Ethereum Package Registry. See the following link for an example configuration:" +
            OS.EOL +
            OS.EOL +
            "    http://truffleframework.com/tutorials/using-infura-custom-provider" +
            OS.EOL
        )
      );
    }

    options.network = "ropsten";

    var provider = options.provider;
    var web3 = new Web3Shim({
      provider: options.provider,
      networkType: "ethereum"
    });
    var host = options.ethpm.ipfs_host;

    if (host instanceof EthPM.hosts.IPFS === false) {
      host = new EthPM.hosts.IPFS(
        options.ethpm.ipfs_host,
        options.ethpm.ipfs_port,
        options.ethpm.ipfs_protocol
      );
    }

    options.logger.log("Finding publishable artifacts...");

    self.publishable_artifacts(options, function(err, artifacts) {
      if (err) return callback(err);

      web3.eth
        .getAccounts()
        .then(async accs => {
          var registry = await EthPMRegistry.use(
            options.ethpm.registry,
            accs[0],
            provider
          );
          var pkg = new EthPM(options.working_directory, host, registry);

          fs.access(
            path.join(options.working_directory, "ethpm.json"),
            fs.constants.R_OK,
            function(err) {
              var manifest;

              // If the ethpm.json file doesn't exist, use the config as the manifest.
              if (err) {
                manifest = options;
              }

              options.logger.log(
                "Uploading sources and publishing to registry..."
              );

              // TODO: Gather contract_types and deployments
              pkg
                .publish(
                  artifacts.contract_types,
                  artifacts.deployments,
                  manifest
                )
                .then(function(lockfile) {
                  // If we get here, publishing was a success.
                  options.logger.log(
                    "+ " + lockfile.package_name + "@" + lockfile.version
                  );
                  callback();
                })
                .catch(callback);
            }
          );
        })
        .catch(callback);
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
  },

  // Return a list of publishable artifacts
  publishable_artifacts: function(options, callback) {
    // Filter out "test" and "development" networks.
    var deployed_networks = Object.keys(options.networks).filter(function(
      network_name
    ) {
      return network_name !== "test" && network_name !== "development";
    });

    // Now get the URIs of each network that's been deployed to.
    Networks.asURIs(options, deployed_networks, function(err, result) {
      if (err) return callback(err);

      var uris = result.uris;

      if (result.failed.length > 0) {
        return callback(
          new Error(
            "Could not connect to the following networks: " +
              result.failed.join(", ") +
              ". These networks have deployed artifacts that can't be published as a package without an active and accessible connection. Please ensure clients for each network are up and running prior to publishing, or use the -n option to specify specific networks you'd like published."
          )
        );
      }

      var files = fs.readdirSync(options.contracts_build_directory);
      files = files.filter(file => file.includes(".json"));

      if (!files.length) {
        var msg =
          "Could not locate any publishable artifacts in " +
          options.contracts_build_directory +
          ". " +
          "Run `truffle compile` before publishing.";

        return callback(new Error(msg));
      }

      var promises = files.map(function(file) {
        return new Promise(function(accept, reject) {
          fs.readFile(
            path.join(options.contracts_build_directory, file),
            "utf8",
            function(err, body) {
              if (err) return reject(err);

              try {
                body = JSON.parse(body);
              } catch (e) {
                return reject(e);
              }

              accept(body);
            }
          );
        });
      });

      var contract_types = {};
      var deployments = {};

      Promise.all(promises)
        .then(function(contracts) {
          // contract_types first.
          contracts.forEach(function(data) {
            contract_types[data.contractName] = {
              contract_name: data.contractName,
              bytecode: data.bytecode,
              abi: data.abi
            };
          });

          //var network_cache = {};
          var matching_promises = [];

          contracts.forEach(function(data) {
            Object.keys(data.networks).forEach(function(network_id) {
              matching_promises.push(
                new Promise(function(accept, reject) {
                  // Go through each deployed network and see if this network matches.
                  // Bail early if we foun done.
                  async.each(
                    deployed_networks,
                    function(deployed_network, finished) {
                      Networks.matchesNetwork(
                        network_id,
                        options.networks[deployed_network],
                        function(err, matches) {
                          if (err) return finished(err);
                          if (matches) {
                            var uri = uris[deployed_network];

                            if (!deployments[uri]) {
                              deployments[uri] = {};
                            }

                            deployments[uri][data.contractName] = {
                              contract_type: data.contractName, // TODO: Handle conflict resolution
                              address: data.networks[network_id].address
                            };

                            return finished("bail early");
                          }
                          finished();
                        }
                      );
                    },
                    function(err) {
                      if (err && err !== "bail early") {
                        return reject(err);
                      }

                      accept();
                    }
                  );
                })
              );
            });
          });

          return Promise.all(matching_promises);
        })
        .then(function() {
          var to_return = {
            contract_types: contract_types,
            deployments: deployments
          };

          callback(null, to_return);
        })
        .catch(callback);
    });
  }
};

module.exports = Package;
