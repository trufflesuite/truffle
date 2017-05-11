var sha3 = require("crypto-js/sha3");
var schema_version = require("./package.json").version;

// TODO: This whole thing should have a json schema.

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
  normalizeInput: function(options, extra_options) {
    extra_options = extra_options || {};
    var normalized = {};
    var expected_keys = [
      "contract_name",
      "abi",
      "bytecode",
      "deployedBytecode",
      "sourceMap",
      "deployedSourceMap",
      "linkReferences",
      "deployedLinkReferences",
      "source",
      "sourcePath",
      "ast",
      "address",
      "networks",
      "updated_at"
    ];

    var deprecated_key_mappings = {
      "unlinked_binary": "bytecode",
      "binary": "bytecode",
      "srcmap": "sourceMap",
      "srcmapRuntime": "deployedSourceMap",
      "interface": "abi"
    };

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

    Object.keys(deprecated_key_mappings).forEach(function(deprecated_key) {
      var mapped_key = deprecated_key_mappings[deprecated_key];

      if (normalized[mapped_key] == null) {
        normalized[mapped_key] = options[deprecated_key] || extra_options[deprecated_key];
      }
    });

    if (typeof normalized.abi == "string") {
      normalized.abi = JSON.parse(normalized.abi);
    }

    this.copyCustomOptions(options, normalized);

    return normalized;
  },

  // Generate a proper binary from normalized options, and optionally
  // merge it with an existing binary.
  // TODO: This function needs to be renamed. Binary is a misnomer.
  generateObject: function(options, existing_object, extra_options) {
    existing_object = existing_object || {};
    extra_options = extra_options || {};

    options.networks = options.networks || {};
    existing_object.networks = existing_object.networks || {};

    // Merge networks before overwriting
    Object.keys(existing_object.networks).forEach(function(network_id) {
      options.networks[network_id] = existing_object.networks[network_id];
    });

    var obj = this.normalizeInput(existing_object, options);

    if (options.overwrite == true) {
      existing_object = {};
    }

    obj.contract_name = obj.contract_name || "Contract";

    // Ensure unlinked binary starts with a 0x
    // TODO: Remove this and enforce it through json schema
    if (obj.bytecode && obj.bytecode.indexOf("0x") < 0) {
      obj.bytecode = "0x" + obj.bytecode;
    }

    var updated_at = new Date().getTime();

    obj.schema_version = schema_version;

    if (extra_options.dirty !== false) {
      obj.updated_at = updated_at;
    } else {
      obj.updated_at = options.updated_at || existing_object.updated_at || updated_at;
    }

    this.copyCustomOptions(options, obj);

    return obj;
  },

  copyCustomOptions: function(from, to) {
    // Now let all x- options through.
    Object.keys(from).forEach(function(key) {
      if (key.indexOf("x-") != 0) return;

      try {
        value = from[key];

        if (value != undefined) {
          to[key] = value;
        }
      } catch (e) {
        // Do nothing.
      }
    });
  }
};

module.exports = TruffleSchema;
