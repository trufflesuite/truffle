const fs = require("fs");
const path = require("path");
const OS = require("os");
const BlockchainUtils = require("@truffle/blockchain-utils");
const Provider = require("@truffle/provider");
const { createInterfaceAdapter } = require("@truffle/interface-adapter");

const Networks = {
  deployed: async function(options) {
    let files;
    try {
      // Only read JSON files in directory
      files = fs
        .readdirSync(options.contracts_build_directory)
        .filter(fn => fn.endsWith(".json"));
    } catch (error) {
      // We can't read the directory. Act like we found nothing.
      files = [];
    }

    const binaries = files.map(file => {
      const filePath = path.join(options.contracts_build_directory, file);
      const fileContents = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileContents);
    });

    const idsToNames = {};
    const networks = {};

    for (let networkName in options.networks) {
      const network = options.networks[networkName];
      const networkId = network.network_id;

      if (networkId == null) return;

      idsToNames[networkId] = networkName;
      networks[networkName] = {};
    }

    for (let json of binaries) {
      for (let networkId in json.networks) {
        const networkName = idsToNames[networkId] || networkId;

        if (networks[networkName] == null) networks[networkName] = {};

        const address = json.networks[networkId].address;

        if (address == null) return;

        networks[networkName][json.contractName] = address;
      }
    }
    return networks;
  },

  display: async function(config) {
    const networks = await this.deployed(config);
    const { networkNames, starNetworks } = Object.keys(networks)
      .sort()
      .reduce(
        (acc, networkName) => {
          if (
            config.networks[networkName] &&
            config.networks[networkName].network_id === "*"
          ) {
            acc.starNetworks.push(networkName);
          } else {
            acc.networkNames.push(networkName);
          }
          return acc;
        },
        { networkNames: [], starNetworks: [] }
      );

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

    networkNames.forEach(networkName => {
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
  },

  clean: async function(config) {
    // Only read JSON files in directory
    let files = fs
      .readdirSync(config.contracts_build_directory)
      .filter(fn => fn.endsWith(".json"));
    const configuredNetworks = Object.keys(config.networks);
    const results = [];

    files.forEach(file => {
      const filePath = path.join(config.contracts_build_directory, file);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const body = JSON.parse(fileContents);

      for (let installedNetworkId of Object.keys(body.networks)) {
        let found = false;
        for (let i = 0; i < configuredNetworks.length; i++) {
          const configuredNetwork = configuredNetworks[i];

          // If an installed network id matches a configured id, then we can ignore this one.
          let parsedNetworkId;
          try {
            // Account for an integer or string in the config
            parsedNetworkId = parseInt(installedNetworkId);
          } catch (_error) {
            // If it can't be parsed into an int like * then don't worry about it
          }
          if (
            installedNetworkId ===
              config.networks[configuredNetwork].network_id ||
            parsedNetworkId === config.networks[configuredNetwork].network_id
          ) {
            found = true;
            break;
          }
        }
        // If we didn't find a suitable configuration, delete this network.
        if (found === false) delete body.networks[installedNetworkId];
      }
      // Our work is done here. Save the file.
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf8");
      results.push(body);
    });

    // TODO: Display what's removed?
    return results;
  },

  // Try to connect to every named network except for "test" and "development"
  asURIs: async function(options, networks) {
    const result = {
      uris: {},
      failed: []
    };

    for (const networkName of networks) {
      const provider = Provider.create(options.networks[networkName]);
      try {
        const uri = await BlockchainUtils.asURI(provider);
        result.uris[networkName] = uri;
      } catch (error) {
        result.failed.push(networkName);
      }
    }

    return result;
  },

  matchesNetwork: async function(network_id, network_options) {
    const provider = Provider.create(network_options);

    const first = network_id + "";
    const second = network_options.network_id + "";

    if (first === second) return true;

    const isFirstANumber = isNaN(parseInt(network_id)) === false;
    const isSecondANumber =
      isNaN(parseInt(network_options.network_id)) === false;

    // If both network ids are numbers, then they don't match, and we should quit.
    if (isFirstANumber && isSecondANumber) return false;

    const interfaceAdapter = createInterfaceAdapter({
      provider,
      networkType: network_options.type
    });

    const currentNetworkID = await interfaceAdapter.getNetworkId();
    if (first === currentNetworkID) return true;
    if (isFirstANumber === false)
      await BlockchainUtils.matches(first, provider);
    else {
      // Nothing else to compare.
      return false;
    }
  }
};

module.exports = Networks;
