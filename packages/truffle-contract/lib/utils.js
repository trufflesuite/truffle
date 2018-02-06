var Web3 = require('web3');
var web3 = new Web3();
var ethJSABI = require("ethjs-abi");
var abi = require("web3-eth-abi");

var Utils = {
  is_object: function(val) {
    return typeof val == "object" && !Array.isArray(val);
  },
  is_big_number: function(val) {
    if (typeof val != "object") return false;

    return web3.utils.isBN(val) || web3.utils.isBigNumber(val);
  },

  decodeLogs: function(C, events, isSingle) {
    var logs = Utils.toTruffleLog(events, isSingle);
    return logs.map(function(log) {
      try{
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
    } catch(error){
      console.log(error)
    }
    }).filter(function(log) {
      return log != null;
    });
  },

  toTruffleLog: function(events, isSingle){
    var logs = [];

    // Transform singletons (from event listeners) to the kind of
    // object we find on the receipt
    if (isSingle){
      var temp = {};
      temp[events.event] = events;
      events = temp;
    }

    Object.keys(events).forEach(function(key){
      var log = events[key];
      log.data = log.raw.data;
      log.topics = log.raw.topics;
      logs.push(events[key]);
    })
    return logs;
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
};

module.exports = Utils;