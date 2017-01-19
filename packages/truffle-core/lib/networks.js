var expect = require("truffle-expect");
var fs = require("fs");
var path = require("path");
var Web3 = require("web3");

var Networks = {
  // It's important config is a Config object and not a vanilla object
  detectNetwork: function(config, callback) {
    expect.options(config, [
      "networks"
    ]);

    if (!config.network && config.networks["development"]) {
      config.network = "development";
    }

    if (!config.network) {
      return callback(new Error("No network specified. Cannot determine current network."));
    }

    var network_id = config.networks[config.network].network_id;

    if (network_id == null) {
      return callback(new Error("You must specify a network_id in your '" + config.network + "' configuration in order to use this network."));
    }

    if (network_id != "*") {
      return callback(null, network_id);
    }

    // Now we have a "*" network. Get the current network and replace it with the real one.
    // TODO: Should we replace this with the blockchain uri?
    var web3 = new Web3(config.provider);
    web3.version.getNetwork(function(err, id) {
      if (err) return callback(err);
      network_id = id;
      config.networks[config.network].network_id = network_id;
      callback(null, network_id);
    });
  },

  deployed: function(options, callback) {
    fs.readdir(options.contracts_build_directory, function(err, files) {
      if (err) {
        // We can't read the directory. Act like we found nothing.
        files = [];
      }

      var promises = [];

      files.forEach(function(file) {
        promises.push(new Promise(function(accept, reject) {
          fs.readFile(path.join(options.contracts_build_directory, file), "utf8", function(err, body) {
            if (err) return reject(err);

            try {
              body = JSON.parse(body);
            } catch (e) {
              return reject(e);
            }

            accept(body);
          });
        }));
      });

      Promise.all(promises).then(function(binaries) {
        var ids_to_names = {};
        var networks = {};

        // binaries.map(function(b) {return b.contract_name + ": " + JSON.stringify(b.networks, null, 2)}).forEach(function(b) {
        //   console.log(b);
        // });

        Object.keys(options.networks).forEach(function(network_name) {
          var network = options.networks[network_name];
          var network_id = network.network_id;

          if (network_id == null) {
            return;
          }

          ids_to_names[network_id] = network_name;
          networks[network_name] = {};
        });

        binaries.forEach(function(json) {
          Object.keys(json.networks).forEach(function(network_id) {
            var network_name = ids_to_names[network_id] || network_id;

            if (networks[network_name] == null) {
              networks[network_name] = {};
            }

            var address = json.networks[network_id].address;

            if (address == null) return;

            networks[network_name][json.contract_name] = address;
          });
        });

        callback(null, networks);
      }).catch(callback);
    });
  }
};

module.exports = Networks;
