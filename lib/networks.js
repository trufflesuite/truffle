var artifactor = require("truffle-artifactor");

var Networks = {
  deployed: function(options, callback) {
    artifactor.requireAll(options.contracts_build_directory, function(err, contracts) {
      if (err) return callback(err);

      var ids_to_names = {};
      var networks = {};

      Object.keys(options.networks).forEach(function(network_name) {
        var network = options.networks[network_name];

        // Ignore the test network that's configured by default.
        if (network_name == "test" && network.network_id == null) {
          return;
        }

        var network_id = network.network_id || "*";
        ids_to_names[network_id] = network_name;
        networks[network_name] = {};
      });

      contracts.forEach(function(contract) {
        Object.keys(contract.all_networks).forEach(function(network_id) {
          var network_name = ids_to_names[network_id] || network_id;

          if (networks[network_name] == null) {
            networks[network_name] = {};
          }

          var address = contract.all_networks[network_id].address;

          if (address == null) return;

          networks[network_name][contract.contract_name] = address;
        });
      });

      callback(null, networks);
    });
  }
};

module.exports = Networks;
