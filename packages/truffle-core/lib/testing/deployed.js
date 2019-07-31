// Using web3 for its sha function...
var Web3 = require("web3");
const semver = require("semver");
const Native = require("truffle-compile/compilerSupplier/loadingStrategies/Native");

var Deployed = {
  makeSolidityDeployedAddressesLibrary: function(
    mapping,
    { solc: { version } }
  ) {
    var self = this;

    var source = "";
    source += "pragma solidity ^0.5.0; \n\n library DeployedAddresses {" + "\n";

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
    var web3 = new Web3();
    address = address.toLowerCase().replace("0x", "");
    var hash = web3.utils.sha3(address).replace("0x", "");
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
