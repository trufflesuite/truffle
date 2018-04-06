var Web3 = require('web3');
var abi = require("web3-eth-abi");

var web3 = new Web3();

var Utils = {
  is_object: function(val) {
    return typeof val == "object" && !Array.isArray(val);
  },
  is_big_number: function(val) {
    if (typeof val != "object") return false;

    return web3.utils.isBN(val) || web3.utils.isBigNumber(val);
  },

  decodeLogs: function(C, _logs, isSingle) {
    var logs = Utils.toTruffleLog(_logs, isSingle);

    return logs.map(function(log) {
      var logABI = C.events[log.topics[0]];

      if (logABI == null) {
        return null;
      }

      var copy = Utils.merge({}, log);

      copy.event = logABI.name;
      copy.topics = logABI.anonymous ? copy.topics : copy.topics.slice(1);
      copy.args = abi.decodeLog(logABI.inputs, copy.data, copy.topics);

      delete copy.data;
      delete copy.topics;

      return copy;
    }).filter(function(log) {
      return log != null;
    });
  },

  toTruffleLog: function(events, isSingle){
    // Transform singletons (from event listeners) to the kind of
    // object we find on the receipt
    if (isSingle){
      var temp = [];
      temp.push(events)
      return temp.map(function(log){
        log.data = log.raw.data;
        log.topics = log.raw.topics;
        return log;
      })
    }
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
  parallel: function (arr, callback) {
    callback = callback || function () {};
    if (!arr.length) {
      return callback(null, []);
    }
    var index = 0;
    var results = new Array(arr.length);
    arr.forEach(function (fn, position) {
      fn(function (err, result) {
        if (err) {
          callback(err);
          callback = function () {};
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
  getTxParams: function(args, C){
    var tx_params =  {};
    var last_arg = args[args.length - 1];

    // It's only tx_params if it's an object and not a BigNumber.
    if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
      tx_params = args.pop();
    }
    tx_params = Utils.merge(C.class_defaults, tx_params);
    return tx_params;
  },

  // Verifies that a contracts libraries have been linked correctly.
  // Throws on error
  checkLibraries: function(C){
    var regex = /__[^_]+_+/g;
    var unlinked_libraries = C.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      var error = C.contractName +
                  " contains unresolved libraries. You must deploy and link" +
                  " the following libraries before you can deploy a new version of " +
                  C._json.contractName + ": " + unlinked_libraries;


      throw new Error(error);
    }
  },
};

module.exports = Utils;
