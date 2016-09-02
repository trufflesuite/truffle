var Contracts = require("../contracts");
var Profiler = require("../profiler");
var path = require("path");

var Deployed = {

  makeSolidityDeployedAddressesLibrary: function(contract_files, contracts) {
    contracts = contracts || [];

    var addresses = contracts.reduce(function(obj, contract) {
      obj[contract.contract_name] = contract.address;
      return obj;
    }, {});

    var source = "";
    source += "library DeployedAddresses {" + "\n";

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
  },

  // contracts_directory - directory to find contracts that will be included
  makeSolidityContractsLibrary: function(contract_files, contracts) {
    contracts = contracts || [];

    var source = "";

    contract_files.forEach(function(file) {
      source += "import \"" + path.resolve(file) + "\";" + "\n";
    });

    source += "import \"truffle/Addresses.sol\";" + "\n";
    source += "\n";
    source += "library Contracts {" + "\n";

    contract_files.forEach(function(file) {
      var name = path.basename(file, ".sol");
      source += "  function deployed" + name + "() returns (" + name + ") { return " + name + "(Addresses.deployed" + name + "Address()); }"
      source += "\n";
    });

    source += "}";

    return source;
  }
};

module.exports = Deployed;
