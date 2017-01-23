var fs = require("fs");
var path = require("path");
var OS = require("os");

var Networks = {
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
  },

  display: function(config, callback) {
    this.deployed(config, function(err, networks) {
      if (err) return callback(err);

      var network_names = Object.keys(networks).sort();

      var star_networks = network_names.filter(function(network_name) {
        return config.networks[network_name] != null && config.networks[network_name].network_id == "*";
      });

      // Remove * networks from network names.
      network_names = network_names.filter(function(network_name) {
        return star_networks.indexOf(network_name) < 0;
      });

      var unknown_networks = network_names.filter(function(network_name) {
        var configured_networks = Object.keys(config.networks);
        var found = false;
        for (var i = 0; i < configured_networks.length; i++) {
          var configured_network_name = configured_networks[i];
          if (network_name == configured_network_name) {
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
      if (star_networks.length > 0 && network_names.length > 0 && unknown_networks.length > 0) {
        config.logger.log(OS.EOL + "The following networks are configured to match any network id ('*'):" + OS.EOL)

        star_networks.forEach(function(network_name) {
          config.logger.log("    " + network_name);
        });

        config.logger.log(OS.EOL + "Closely inspect the deployed networks below, and use `truffle networks --clean` to remove any networks that don't match your configuration. You should not use the wildcard configuration ('*') for staging and production networks for which you intend to deploy your application.")
      }

      network_names.forEach(function(network_name) {
        config.logger.log("")

        var output = Object.keys(networks[network_name]).sort().map(function(contract_name) {
          var address = networks[network_name][contract_name];
          return contract_name + ": " + address;
        });

        if (output.length == 0) {
          output = ["No contracts deployed."];
        }

        var message = "Network: ";

        var is_id = config.networks[network_name] == null;

        if (is_id) {
          message += "UNKNOWN (id: " + network_name + ")";
        } else {
          message += network_name + " (id: " + config.networks[network_name].network_id + ")";
        }

        config.logger.log(message);
        config.logger.log("  " + output.join("\n  "))
      });

      if (network_names.length == 0) {
        config.logger.log(OS.EOL + "Contracts have not been deployed to any network.");
      }

      config.logger.log("");

      callback();
    });
  },

  clean: function(config, callback) {
    fs.readdir(config.contracts_build_directory, function(err, files) {
      if (err) return callback(err);

      var configured_networks = Object.keys(config.networks);
      var promises = [];

      files.forEach(function(file) {
        promises.push(new Promise(function(accept, reject) {
          var file_path = path.join(config.contracts_build_directory, file);
          fs.readFile(file_path, "utf8", function(err, body) {
            if (err) return reject(err);

            try {
              body = JSON.parse(body);
            } catch (e) {
              return reject(e);
            }

            Object.keys(body.networks).forEach(function(installed_network_id) {
              var found = false;
              for (var i = 0; i < configured_networks.length; i++) {
                var configured_network = configured_networks[i];

                // If an installed network id matches a configured id, then we can ignore this one.
                if (installed_network_id == config.networks[configured_network].network_id) {
                  found = true;
                  break;
                }
              }

              // If we didn't find a suitable configuration, delete this network.
              if (found == false) {
                delete body.networks[installed_network_id];
              }
            });

            // Our work is done here. Save the file.
            fs.writeFile(file_path, JSON.stringify(body, null, 2), "utf8", function(err) {
              if (err) return reject(err);
              accept(body);
            });
          });
        }));
      });

      // TODO: Display what's removed?
      Promise.all(promises).then(function() {
        callback();
      }).catch(callback);
    });
  }
};

module.exports = Networks;
