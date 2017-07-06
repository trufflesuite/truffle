var pkg = require("../package.json");
var solcpkg = require("solc/package.json");

var bundle_version = null;

// NOTE: Webpack will replace BUNDLE_VERSION with a string.
if (typeof BUNDLE_VERSION != "undefined") {
  bundle_version = BUNDLE_VERSION;
}

module.exports = {
  core: pkg.version,
  bundle: bundle_version,
  solc: solcpkg.version
};
