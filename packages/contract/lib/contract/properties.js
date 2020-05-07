const utils = require("../utils");
const web3Utils = require("web3-utils");

module.exports = {
  contract_name: {
    get: function() {
      return this.contractName;
    },
    set: function(val) {
      this.contractName = val;
    }
  },
  contractName: {
    get: function() {
      return this._json.contractName || "Contract";
    },
    set: function(val) {
      this._json.contractName = val;
    }
  },

  gasMultiplier: {
    get: function() {
      if (this._json.gasMultiplier === undefined) {
        this._json.gasMultiplier = 1.25;
      }
      return this._json.gasMultiplier;
    },
    set: function(val) {
      this._json.gasMultiplier = val;
    }
  },
  timeoutBlocks: {
    get: function() {
      return this._json.timeoutBlocks;
    },
    set: function(val) {
      this._json.timeoutBlocks = val;
    }
  },
  autoGas: {
    get: function() {
      if (this._json.autoGas === undefined) {
        this._json.autoGas = true;
      }
      return this._json.autoGas;
    },
    set: function(val) {
      this._json.autoGas = val;
    }
  },
  numberFormat: {
    get: function() {
      if (this._json.numberFormat === undefined) {
        this._json.numberFormat = "BN";
      }
      return this._json.numberFormat;
    },
    set: function(val) {
      const allowedFormats = ["BigNumber", "BN", "String"];

      const msg =
        `Invalid number format setting: "${val}": ` +
        `valid formats are: ${JSON.stringify(allowedFormats)}.`;

      if (!allowedFormats.includes(val)) throw new Error(msg);

      this._json.numberFormat = val;
    }
  },
  abi: {
    get: function() {
      return this._json.abi;
    },
    set: function(val) {
      this._json.abi = val;
    }
  },
  metadata: function() {
    return this._json.metadata;
  },
  network: function() {
    var network_id = this.network_id;

    if (network_id == null) {
      var error =
        this.contractName +
        " has no network id set, cannot lookup artifact data." +
        " Either set the network manually using " +
        this.contractName +
        ".setNetwork(), run " +
        this.contractName +
        ".detectNetwork(), or use new()," +
        " at() or deployed() as a thenable which will detect the network automatically.";

      throw new Error(error);
    }

    // TODO: this might be bad; setting a value on a get.
    if (this._json.networks[network_id] == null) {
      var error =
        this.contractName +
        " has no network configuration" +
        " for its current network id (" +
        network_id +
        ").";

      throw new Error(error);
    }

    var returnVal = this._json.networks[network_id];

    // Normalize output
    if (returnVal.links == null) {
      returnVal.links = {};
    }

    if (returnVal.events == null) {
      returnVal.events = {};
    }

    return returnVal;
  },
  networks: function() {
    return this._json.networks;
  },
  address: {
    get: function() {
      var address = this.network.address;

      if (address == null) {
        var error =
          "Cannot find deployed address: " +
          this.contractName +
          " not deployed or address not set.";
        throw new Error(error);
      }

      return address;
    },
    set: function(val) {
      if (val == null) {
        throw new Error("Cannot set deployed address; malformed value: " + val);
      }

      var network_id = this.network_id;

      if (network_id == null) {
        var error =
          this.contractName +
          " has no network id set, cannot lookup artifact data." +
          " Either set the network manually using " +
          this.contractName +
          ".setNetwork(), run " +
          this.contractName +
          ".detectNetwork()," +
          " or use new(), at() or deployed() as a thenable which will" +
          " detect the network automatically.";

        throw new Error(error);
      }

      // Create a network if we don't have one.
      if (this._json.networks[network_id] == null) {
        this._json.networks[network_id] = {
          events: {},
          links: {}
        };
      }

      // Finally, set the address.
      this.network.address = val;
    }
  },
  transactionHash: {
    get: function() {
      return this.network.transactionHash;
    },
    set: function(val) {
      this.network.transactionHash = val;
    }
  },
  links: function() {
    if (!this.network_id) {
      var error =
        this.contractName +
        " has no network id set, cannot lookup artifact data." +
        " Either set the network manually using " +
        this.contractName +
        ".setNetwork()," +
        " run " +
        this.contractName +
        ".detectNetwork(), or use new(), at()" +
        " or deployed() as a thenable which will detect the network automatically.";

      throw new Error(error);
    }

    if (this._json.networks[this.network_id] == null) {
      return {};
    }

    return this.network.links || {};
  },
  events: function() {
    var events;

    if (this._json.networks[this.network_id] == null) {
      events = {};
    } else {
      events = this.network.events || {};
    }

    // Merge abi events with whatever's returned.
    var abi = this.abi;

    abi.forEach(function(item) {
      if (item.type !== "event") return;

      if (item.signature) {
        events[item.signature] = item;
      } else {
        var signature = item.name + "(";

        item.inputs.forEach(function(input, index) {
          signature += input.type;

          if (index < item.inputs.length - 1) {
            signature += ",";
          }
        });

        signature += ")";

        var topic = web3Utils.keccak256(signature);

        events[topic] = item;
      }
    });

    return events;
  },
  binary: function() {
    return utils.linkBytecode(this.bytecode, this.links);
  },
  deployedBinary: function() {
    return utils.linkBytecode(this.deployedBytecode, this.links);
  },

  // deprecated; use bytecode
  unlinked_binary: {
    get: function() {
      return this.bytecode;
    },
    set: function(val) {
      this.bytecode = val;
    }
  },
  // alias for unlinked_binary; unlinked_binary will eventually be deprecated
  bytecode: {
    get: function() {
      return this._json.bytecode;
    },
    set: function(val) {
      this._json.bytecode = val;
    }
  },
  deployedBytecode: {
    get: function() {
      var code = this._json.deployedBytecode;

      if (!code) {
        return code;
      }

      if (code.indexOf("0x") !== 0) {
        code = "0x" + code;
      }

      return code;
    },
    set: function(val) {
      var code = val;

      if (val && val.indexOf("0x") !== 0) {
        code = "0x" + code;
      }

      this._json.deployedBytecode = code;
    }
  },
  sourceMap: {
    get: function() {
      return this._json.sourceMap;
    },
    set: function(val) {
      this._json.sourceMap = val;
    }
  },
  deployedSourceMap: {
    get: function() {
      return this._json.deployedSourceMap;
    },
    set: function(val) {
      this._json.deployedSourceMap = val;
    }
  },
  source: {
    get: function() {
      return this._json.source;
    },
    set: function(val) {
      this._json.source = val;
    }
  },
  sourcePath: {
    get: function() {
      return this._json.sourcePath;
    },
    set: function(val) {
      this._json.sourcePath = val;
    }
  },
  legacyAST: {
    get: function() {
      return this._json.legacyAST;
    },
    set: function(val) {
      this._json.legacyAST = val;
    }
  },
  ast: {
    get: function() {
      return this._json.ast;
    },
    set: function(val) {
      this._json.ast = val;
    }
  },
  compiler: {
    get: function() {
      return this._json.compiler;
    },
    set: function(val) {
      this._json.compiler = val;
    }
  },
  // Deprecated
  schema_version: function() {
    return this.schemaVersion;
  },
  schemaVersion: function() {
    return this._json.schemaVersion;
  },
  // deprecated
  updated_at: function() {
    return this.updatedAt;
  },
  updatedAt: function() {
    try {
      return this.network.updatedAt || this._json.updatedAt;
    } catch (e) {
      return this._json.updatedAt;
    }
  },
  userdoc: function() {
    return this._json.userdoc;
  },
  devdoc: function() {
    return this._json.devdoc;
  },
  networkType: {
    get: function() {
      return this._json.networkType || "ethereum";
    },
    set: function(_networkType) {
      this._json.networkType = _networkType;
    }
  },
  immutableReferences: {
    get: function() {
      return this._json.immutableReferences;
    },
    set: function(refs) {
      this._json.immutableReferences = refs;
    }
  }
};
