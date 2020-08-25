const web3Utils = require("web3-utils");
const semver = require("semver");
const Native = require("@truffle/compile-solidity/compilerSupplier/loadingStrategies/Native");
const Local = require("@truffle/compile-solidity/compilerSupplier/loadingStrategies/Local");
const path = require("path");
const fs = require("fs-extra");

var Deployed = {
  makeSolidityDeployedAddressesLibrary: function (
    mapping,
    { solc: { version } }
  ) {
    var self = this;

    var source = "";
    source +=
      "//SPDX-License-Identifier: MIT\n" +
      "pragma solidity >= 0.5.0 < 0.8.0; \n\n library DeployedAddresses {" +
      "\n";

    Object.keys(mapping).forEach(function (name) {
      var address = mapping[name];

      var body = "revert();";

      if (address) {
        address = self.toChecksumAddress(address);

        body = "return " + address + ";";
      }

      source +=
        "  function " +
        name +
        "() public pure returns (address payable) { " +
        body +
        " }";
      source += "\n";
    });

    source += "}";

    //note: default version is 0.5.16 which does not require any modifications
    //so we can skip this block for it
    if (version) {
      //if version was native or local, must determine what version that
      //actually corresponds to
      if (version === "native") {
        version = new Native().load().version();
      } else if (fs.existsSync(version) && path.isAbsolute(version)) {
        version = new Local({ version }).load().version();
      }
      //otherwise, version is a version string or version range string
      const versionBefore = semver.satisfies(version, "0.4.x || <0.4.0", {
        includePrerelease: true,
        loose: true
      });
      const rangeBefore =
        semver.validRange(version) &&
        semver.gtr("0.5.0", versionString, {
          includePrerelease: true,
          loose: true
        }); //gtr will throw if given undefined so must ward against
      if (versionBefore || rangeBefore) {
        //remove "payable"s if we're before 0.5.0
        source = source.replace(/ payable/gm, "");
      }
      //regardless of version, replace all pragmas with the new version
      const coercedVersion =
        semver.validRange(version) || semver.coerce(version).toString();
      source = source.replace(/0\.5\.0/gm, coercedVersion);
    }

    return source;
  },

  // Pulled from ethereumjs-util, but I don't want all its dependencies at the moment.
  toChecksumAddress: function (address) {
    address = address.toLowerCase().replace("0x", "");
    const hash = web3Utils.sha3(address).replace("0x", "");
    var ret = "0x";

    for (var i = 0; i < address.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        ret += address[i].toUpperCase();
      } else {
        ret += address[i];
      }
    }

    return ret;
  }
};

module.exports = Deployed;
