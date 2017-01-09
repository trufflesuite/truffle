var sha3 = require("crypto-js/sha3");
var schema_version = require("./package.json").version;

var TruffleSchema = {
  // Normalize options passed in to be the exact options required
  // for truffle-contract.
  //
  // options can be three things:
  // - normal object
  // - contract object
  // - solc output
  //
  // TODO: Is extra_options still necessary?
  normalizeOptions: function(options, extra_options) {
    extra_options = extra_options || {};
    var normalized = {};
    var expected_keys = [
      "contract_name",
      "abi",
      "binary",
      "unlinked_binary",
      "address",
      "networks",
      "links",
      "events",
      "network_id",
      "default_network"
    ];

    // Merge options/contract object first, then extra_options
    expected_keys.forEach(function(key) {
      var value;

      try {
        // Will throw an error if key == address and address doesn't exist.
        value = options[key];

        if (value != undefined) {
          normalized[key] = value;
        }
      } catch (e) {
        // Do nothing.
      }

      try {
        // Will throw an error if key == address and address doesn't exist.
        value = extra_options[key];

        if (value != undefined) {
          normalized[key] = value;
        }
      } catch (e) {
        // Do nothing.
      }
    });

    // Now look for solc specific items.
    if (options.interface != null) {
      normalized.abi = JSON.parse(options.interface);
    }

    if (options.bytecode != null) {
      normalized.unlinked_binary = options.bytecode
    }

    // Assume any binary passed is the unlinked binary
    if (normalized.unlinked_binary == null && normalized.binary) {
      normalized.unlinked_binary = normalized.binary;
    }

    delete normalized.binary;

    return normalized;
  },

  // Generate a proper binary from normalized options, and optionally
  // merge it with an existing binary.
  generateBinary: function(options, existing_binary) {
    existing_binary = existing_binary || {};

    if (options.overwrite == true) {
      existing_binary = {};
    }

    existing_binary.contract_name = options.contract_name || existing_binary.contract_name || "Contract";
    existing_binary.default_network = options.default_network || existing_binary.default_network || "*";

    options.network_id = (options.network_id || "*") + ""; // Assume fallback network if network not specified.

    existing_binary.abi = options.abi || existing_binary.abi;
    existing_binary.unlinked_binary = options.unlinked_binary || existing_binary.unlinked_binary;

    // Ensure unlinked binary starts with a 0x
    if (existing_binary.unlinked_binary && existing_binary.unlinked_binary.indexOf("0x") < 0) {
      existing_binary.unlinked_binary = "0x" + existing_binary.unlinked_binary;
    }

    // Merge existing networks with any passed in networks.
    existing_binary.networks = existing_binary.networks || {};
    options.networks = options.networks || {};
    Object.keys(options.networks).forEach(function(network_id) {
      existing_binary.networks[network_id] = options.networks[network_id];
    });

    // If we have a flat object with a network id, ensure the network exists.
    existing_binary.networks[options.network_id] = existing_binary.networks[options.network_id] || {};

    var updated_at = new Date().getTime();

    var network = existing_binary.networks[options.network_id];

    // Override specific keys
    network.address = options.address || network.address;
    network.links = options.links;

    // merge events with any that previously existed
    network.events = network.events || {};
    options.events = options.events || {};
    Object.keys(options.events).forEach(function(event_id) {
      options.events[event_id] = options.events[event_id];
    });

    // Now overwrite any events with the most recent data from the ABI.
    existing_binary.abi.forEach(function(item) {
      if (item.type != "event") return;

      var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";
      network.events["0x" + sha3(signature, {outputLength: 256})] = item;
    });

    network.updated_at = updated_at;

    // Ensure all networks have a `links` object.
    Object.keys(existing_binary.networks).forEach(function(network_id) {
      var network = existing_binary.networks[network_id];
      network.links = network.links || {};
    });

    existing_binary.schema_version = schema_version;
    existing_binary.updated_at = updated_at;

    return existing_binary;
  }
};

module.exports = TruffleSchema;
