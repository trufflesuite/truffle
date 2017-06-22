var Schema = require("truffle-contract-schema");
var Contract = require("./contract.js");

var contract = function(options) {
  var binary = Schema.normalize(options || {});

  // Note we don't use `new` here at all. This will cause the class to
  // "mutate" instead of instantiate an instance.
  return Contract.clone(binary);
};

// To be used to upgrade old .sol.js abstractions
contract.fromSolJS = function(soljs_abstraction, ignore_default_network) {
  if (ignore_default_network == null) {
    ignore_default_network = false;
  }

  // Find the latest binary
  var latest_network = null;
  var latest_network_updated_at = 0;

  var networks = {};

  Object.keys(soljs_abstraction.all_networks).forEach(function(network_name) {

    if (network_name == "default") {
      if (ignore_default_network == true ) {
        return;
      } else {
        throw new Error(soljs_abstraction.contract_name + " has legacy 'default' network artifacts stored within it. Generally these artifacts were a result of running Truffle on a development environment -- in order to store contracts with truffle-contract, all networks must have an identified id. If you're sure this default network represents your development environment, you can ignore processing of the default network by passing `true` as the second argument to this function. However, if you think this network represents artifacts you'd like to keep (i.e., addresses deployed to the main network), you'll need to edit your .sol.js file yourself and change the default network id to be the id of your desired network. For most people, ignoring the default network is the correct option.");
      }
    }

    if (soljs_abstraction.all_networks[network_name].updated_at > latest_network_updated_at) {
      latest_network = network_name;
      latest_network_updated_at = soljs_abstraction.all_networks[network_name].updated_at;
    }

    networks[network_name] = {};

    ["address", "events", "links", "updated_at"].forEach(function(key) {
      networks[network_name][key] = soljs_abstraction.all_networks[network_name][key];
    })
  });

  latest_network = soljs_abstraction.all_networks[latest_network] || {};

  var json = {
    contractName: soljs_abstraction.contractName,
    unlinked_binary: latest_network.unlinked_binary,
    abi: latest_network.abi,
    networks: networks,
    updated_at: latest_network_updated_at == 0 ? undefined : latest_network_updated_at
  };

  return contract(json);
};

module.exports = contract;

if (typeof window !== "undefined") {
  window.TruffleContract = contract;
}
