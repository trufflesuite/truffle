var fs = require("fs");
var path = require("path");

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
  }
};

module.exports = Networks;
