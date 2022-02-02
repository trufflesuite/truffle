const Model = require("../Model");

class Contract extends Model {
  name = "Default Value";
  abi;
  compilations;
  sources;

  someFunction() {}
}

module.exports = Contract;
