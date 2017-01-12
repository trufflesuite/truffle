var Config = require("../config");
var Networks = require("../networks");

var command = {
  command: 'networks',
  description: 'Show addresses for deployed contracts on each network',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);

    Networks.deployed(config, function(err, networks) {
      if (err) return callback(err);

      Object.keys(networks).sort().forEach(function(network_name) {
        options.logger.log("")

        var output = Object.keys(networks[network_name]).sort().map(function(contract_name) {
          var address = networks[network_name][contract_name];
          return contract_name + ": " + address;
        });

        if (output.length == 0) {
          output = ["No contracts deployed."];
        }

        options.logger.log("Network: " + network_name);
        options.logger.log("  " + output.join("\n  "))
      });

      options.logger.log("");

      done();
    });
  }
}

module.exports = command;
