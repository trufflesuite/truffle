var path = require("path");

var Deployed = {

  makeSolidityDeployedAddressesLibrary: function(contract_files, contracts) {
    contracts = contracts || [];

    var addresses = contracts.reduce(function(obj, contract) {
      obj[contract.contract_name] = contract.address;
      return obj;
    }, {});

    var source = "";
    source += "pragma solidity ^0.4.6; \n\n library DeployedAddresses {" + "\n";

    contract_files.forEach(function(file) {
      var name = path.basename(file, ".sol");
      var address = addresses[name];

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
