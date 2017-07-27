var command = {
  command: 'version',
  description: 'Show version number and exit',
  builder: {},
  run: function (options, done) {
    var version = require("../version");

    var bundle_version;

    if (version.bundle) {
      bundle_version = "v" + version.bundle;
    } else {
      bundle_version = "(unbundled)";
    }

    options.logger.log("Truffle " + bundle_version + " (core: " + version.core + ")");
    options.logger.log("Solidity v" + version.solc + " (solc-js)");

    done();
  }
}

module.exports = command;
