const pkg = require("../package.json");
const solcpkg = require("solc/package.json");
const bundle_version = null;

// NOTE: Webpack will replace BUNDLE_VERSION with a string.
if (typeof BUNDLE_VERSION != "undefined") {
  bundle_version = BUNDLE_VERSION;
}

let bundleVersion;

if (version.bundle) {
  bundleVersion = "v" + version.bundle;
} else {
  bundleVersion = "(unbundled)";
}

module.exports = {
  core: pkg.version,
  bundle: bundleVersion,
  solc: solcpkg.version
};
