var command = {
  command: 'version',
  description: 'Show version number and exit',
  builder: {},
  run: function (options, done) {
    var pkg = require("../../package.json");
    var solcpkg = require("solc/package.json");

    var bundle_version = "N/A";

    // NOTE: Webpack will replace BUNDLE_VERSION with a string.
    if (typeof BUNDLE_VERSION != "undefined") {
      bundle_version = BUNDLE_VERSION;
    }

    options.logger.log("Truffle v" + bundle_version + " (core: " + pkg.version + ")");
    options.logger.log("Solidity v" + solcpkg.version + " (solc-js)");

    done();
  }
}

module.exports = command;
