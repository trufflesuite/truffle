const fs = require("fs");
const path = require("path");
const OS = require("os");
const BlockchainUtils = require("@truffle/blockchain-utils");
const Provider = require("@truffle/provider");
const async = require("async");
const { Web3Shim } = require("@truffle/interface-adapter");

const Networks = {
  deployed: function(options, callback) {
    let files;
    try {
      files = fs.readdirSync(options.contracts_build_directory);
    } catch (error) {
      // We can't read the directory. Act like we found nothing.
      files = [];
    }

    const promises = [];

    files.forEach(function(file) {
      promises.push(
        new Promise(function(accept, reject) {
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
        })
      );
    });

    Promise.all(promises)
      .then(function(binaries) {
        const ids_to_names = {};
        const networks = {};

        // binaries.map(function(b) {return b.contract_name + ": " + JSON.stringify(b.networks, null, 2)}).forEach(function(b) {
        //   console.log(b);
        // });

        Object.keys(options.networks).forEach(networkName => {
          const network = options.networks[networkName];
          const networkId = network.network_id;

          if (networkId == null) return;

          ids_to_names[networkId] = networkName;
          networks[networkName] = {};
        });

        binaries.forEach(function(json) {
          Object.keys(json.networks).forEach(networkId => {
            const network_name = ids_to_names[networkId] || networkId;

            if (networks[network_name] == null) {
              networks[network_name] = {};
            }

            const address = json.networks[networkId].address;

            if (address == null) return;

            networks[network_name][json.contractName] = address;
          });
        });

        callback(null, networks);
      })
      .catch(callback);
  },

  display: function(config, callback) {
    this.deployed(config, function(err, networks) {
      if (err) return callback(err);

      let networkNames = Object.keys(networks).sort();

      const starNetworks = networkNames.filter(networkName => {
        return (
          config.networks[networkName] != null &&
          config.networks[networkName].network_id === "*"
        );
      });

      // Remove * networks from network names.
      networkNames = networkNames.filter(networkName => {
        return starNetworks.indexOf(networkName) < 0;
      });

      const unknownNetworks = networkNames.filter(networkName => {
        const configuredNetworks = Object.keys(config.networks);
        let found = false;
        for (let i = 0; i < configuredNetworks.length; i++) {
          const configuredNetworkName = configuredNetworks[i];
          if (networkName === configuredNetworkName) {
            found = true;
            break;
          }
        }

        return !found;
      });

      // Only display this warning if:
      //
      //   At least one network is configured with the wildcard ('*') network id
      //   There's a least one network deployed to
      //   And one of those networks deployed to is unknown (i.e., unconfigured).
      if (
        starNetworks.length > 0 &&
        networkNames.length > 0 &&
        unknownNetworks.length > 0
      ) {
        config.logger.log(
          OS.EOL +
            "The following networks are configured to match any network id ('*'):" +
            OS.EOL
        );

        starNetworks.forEach(networkName => {
          config.logger.log("    " + networkName);
        });

        config.logger.log(
          OS.EOL +
            "Closely inspect the deployed networks below, and use `truffle networks --clean` to remove any networks that don't match your configuration. You should not use the wildcard configuration ('*') for staging and production networks for which you intend to deploy your application."
        );
      }

      networkNames.forEach(function(networkName) {
        config.logger.log("");

        let output = Object.keys(networks[networkName])
          .sort()
          .map(contract_name => {
            const address = networks[networkName][contract_name];
            return contract_name + ": " + address;
          });

        if (output.length === 0) output = ["No contracts deployed."];

        let message = "Network: ";

        const is_id = config.networks[networkName] == null;

        if (is_id) {
          message += "UNKNOWN (id: " + networkName + ")";
        } else {
          message +=
            networkName +
            " (id: " +
            config.networks[networkName].network_id +
            ")";
        }

        config.logger.log(message);
        config.logger.log("  " + output.join("\n  "));
      });

      if (networkNames.length === 0) {
        config.logger.log(
          OS.EOL + "Contracts have not been deployed to any network."
        );
      }

      config.logger.log("");

      callback();
    });
  },

  clean: function(config, callback) {
    let files;
    try {
      files = fs.readdirSync(config.contracts_build_directory);
    } catch (error) {
      return callback(error);
    }

    const configuredNetworks = Object.keys(config.networks);
    const promises = [];

    files.forEach(function(file) {
      promises.push(
        new Promise((resolve, reject) => {
          const filePath = path.join(config.contracts_build_directory, file);
          let body;
          try {
            const fileContents = fs.readFileSync(filePath, "utf8");
            body = JSON.parse(fileContents);
          } catch (error) {
            reject(error);
          }

          Object.keys(body.networks).forEach(installedNetworkId => {
            let found = false;
            for (let i = 0; i < configuredNetworks.length; i++) {
              const configuredNetwork = configuredNetworks[i];

              // If an installed network id matches a configured id, then we can ignore this one.
              if (
                installedNetworkId ===
                config.networks[configuredNetwork].network_id
              ) {
                found = true;
                break;
              }
            }

            // If we didn't find a suitable configuration, delete this network.
            if (found === false) delete body.networks[installedNetworkId];
          });

          try {
            // Our work is done here. Save the file.
            fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf8");
            resolve(body);
          } catch (error) {
            reject(error);
          }
        })
      );
    });

    // TODO: Display what's removed?
    Promise.all(promises)
      .then(() => {
        callback();
      })
      .catch(callback);
  },

  // Try to connect to every named network except for "test" and "development"
  asURIs: function(options, networks, callback) {
    if (typeof networks === "function") {
      callback = networks;
      networks = Object.keys(options.networks);
    }

    const result = {
      uris: {},
      failed: []
    };

    async.each(
      networks,
      async function(network_name, finished) {
        const provider = Provider.create(options.networks[network_name]);
        BlockchainUtils.asURI(provider, function(err, uri) {
          if (err) {
            result.failed.push(network_name);
          } else {
            result.uris[network_name] = uri;
          }
          finished();
        });
      },
      error => {
        if (error) return callback(error);
        callback(null, result);
      }
    );
  },

  matchesNetwork: async function(network_id, network_options, callback) {
    const provider = Provider.create(network_options);

    const first = network_id + "";
    const second = network_options.network_id + "";

    if (first === second) return callback(null, true);

    const isFirstANumber = isNaN(parseInt(network_id)) === false;
    const isSecondANumber =
      isNaN(parseInt(network_options.network_id)) === false;

    // If both network ids are numbers, then they don't match, and we should quit.
    if (isFirstANumber && isSecondANumber) return callback(null, false);

    const web3 = new Web3Shim({
      provider,
      networkType: network_options.type
    });
    web3.eth.net
      .getId(current_network_id => {
        if (first === current_network_id) return callback(null, true);

        if (isFirstANumber === false) {
          BlockchainUtils.matches(first, provider, callback);
        } else {
          // Nothing else to compare.
          return callback(null, false);
        }
      })
      .catch(callback);
  }
};

module.exports = Networks;
