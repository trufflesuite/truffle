const debug = require("debug")("contract:utils"); // eslint-disable-line no-unused-vars
var web3Utils = require("web3-utils");
var bigNumberify = require("ethers/utils/bignumber").bigNumberify;
var abi = require("web3-eth-abi");
var reformat = require("./reformat");

var Utils = {
  is_object: function(val) {
    return typeof val === "object" && !Array.isArray(val);
  },

  is_big_number: function(val) {
    if (typeof val !== "object") return false;

    return web3Utils.isBN(val) || web3Utils.isBigNumber(val);
  },

  is_tx_params: function(val) {
    if (!Utils.is_object(val)) return false;
    if (Utils.is_big_number(val)) return false;

    const allowed_fields = {
      from: true,
      to: true,
      gas: true,
      gasPrice: true,
      value: true,
      data: true,
      nonce: true
    };

    for (field_name of Object.keys(val)) {
      if (allowed_fields[field_name]) return true;
    }

    return false;
  },

  decodeLogs: function(_logs, isSingle) {
    var constructor = this;
    var logs = Utils.toTruffleLog(_logs, isSingle);

    return logs
      .map(function(log) {
        var logABI = constructor.events[log.topics[0]];

        if (logABI == null) {
          return null;
        }

        var copy = Utils.merge({}, log);

        copy.event = logABI.name;
        copy.topics = logABI.anonymous ? copy.topics : copy.topics.slice(1);

        if (copy.data === "0x") {
          copy.data = "";
        }

        const logArgs = abi.decodeLog(logABI.inputs, copy.data, copy.topics);
        copy.args = reformat.numbers.call(constructor, logArgs, logABI.inputs);

        delete copy.data;
        delete copy.topics;

        return copy;
      })
      .filter(function(log) {
        return log != null;
      });
  },

  toTruffleLog: function(events, isSingle) {
    // Transform singletons (from event listeners) to the kind of
    // object we find on the receipt
    if (isSingle && typeof isSingle === "boolean") {
      var temp = [];
      temp.push(events);
      return temp.map(function(log) {
        log.data = log.raw.data;
        log.topics = log.raw.topics;
        return log;
      });
    }

    // Or reformat items in the existing array
    events.forEach(event => {
      if (event.raw) {
        event.data = event.raw.data;
        event.topics = event.raw.topics;
      }
    });

    return events;
  },

  merge: function() {
    var merged = {};
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < args.length; i++) {
      var object = args[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        merged[key] = value;
      }
    }

    return merged;
  },
  parallel: function(arr, callback) {
    callback = callback || function() {};
    if (!arr.length) {
      return callback(null, []);
    }
    var index = 0;
    var results = new Array(arr.length);
    arr.forEach(function(fn, position) {
      fn(function(err, result) {
        if (err) {
          callback(err);
          callback = function() {};
        } else {
          index++;
          results[position] = result;
          if (index >= arr.length) {
            callback(null, results);
          }
        }
      });
    });
  },

  linkBytecode: function(bytecode, links) {
    Object.keys(links).forEach(function(library_name) {
      var library_address = links[library_name];
      var regex = new RegExp("__" + library_name + "_+", "g");

      bytecode = bytecode.replace(regex, library_address.replace("0x", ""));
    });

    return bytecode;
  },

  // Extracts optional tx params from a list of fn arguments
  getTxParams: function(methodABI, args) {
    var constructor = this;

    var expected_arg_count = methodABI ? methodABI.inputs.length : 0;

    tx_params = {};
    var last_arg = args[args.length - 1];

    if (
      args.length === expected_arg_count + 1 &&
      Utils.is_tx_params(last_arg)
    ) {
      tx_params = args.pop();
    }

    return Utils.merge(constructor.class_defaults, tx_params);
  },

  // Verifies that a contracts libraries have been linked correctly.
  // Throws on error
  checkLibraries: function() {
    var constructor = this;
    var regex = /__[^_]+_+/g;
    var unlinked_libraries = constructor.binary.match(regex);

    if (unlinked_libraries !== null) {
      unlinked_libraries = unlinked_libraries
        .map(function(name) {
          // Remove underscores
          return name.replace(/_/g, "");
        })
        .sort()
        .filter(function(name, index, arr) {
          // Remove duplicates
          if (index + 1 >= arr.length) {
            return true;
          }

          return name !== arr[index + 1];
        })
        .join(", ");

      var error =
        constructor.contractName +
        " contains unresolved libraries. You must deploy and link" +
        " the following libraries before you can deploy a new version of " +
        constructor.contractName +
        ": " +
        unlinked_libraries;

      throw new Error(error);
    }
  },

  convertToEthersBN: function(original) {
    const converted = [];
    original.forEach(item => {
      // Recurse for arrays
      if (Array.isArray(item)) {
        converted.push(Utils.convertToEthersBN(item));

        // Convert Web3 BN / BigNumber
      } else if (Utils.is_big_number(item)) {
        const ethersBN = bigNumberify(item.toString());
        converted.push(ethersBN);
      } else {
        converted.push(item);
      }
    });
    return converted;
  }
};

module.exports = Utils;
