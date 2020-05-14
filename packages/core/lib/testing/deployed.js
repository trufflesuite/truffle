const web3Utils = require("web3-utils");
const semver = require("semver");
const Native = require("@truffle/compile-solidity/compilerSupplier/loadingStrategies/Native");

var Deployed = {
  makeSolidityDeployedAddressesLibrary: function(
    mapping,
    { solc: { version } }
  ) {
    var self = this;

    var source = "";
    source +=
      "//SPDX-License-Identifier: MIT\n" +
      "pragma solidity >= 0.5.0 < 0.7.0; \n\n library DeployedAddresses {" +
      "\n";

    Object.keys(mapping).forEach(function(name) {
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

    if (version) {
      if (version === "native") version = new Native().load().version();
      const v = semver.coerce(version);
      if (semver.lt(v, "0.5.0")) source = source.replace(/ payable/gm, "");
      source = source.replace(/0\.5\.0/gm, v);
    }

    return source;
  },

  // Pulled from ethereumjs-util, but I don't want all its dependencies at the moment.
  toChecksumAddress: function(address) {
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
