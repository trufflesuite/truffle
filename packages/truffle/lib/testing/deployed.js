var Deployed = {

  makeSolidityDeployedAddressesLibrary: function(mapping) {
    var source = "";
    source += "pragma solidity ^0.4.6; \n\n library DeployedAddresses {" + "\n";

    Object.keys(mapping).forEach(function(name) {
      var address = mapping[name];

      var body = "throw;";

      if (address) {
        body = "return " + address + ";";
      }

      source += "  function " + name + "() returns (address) { " + body + " }"
      source += "\n";
    });

    source += "}";

    return source;
  }
};

module.exports = Deployed;
