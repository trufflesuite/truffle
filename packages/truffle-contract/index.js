const Schema = require("truffle-contract-schema");
const Contract = require("./lib/contract");
const truffleContractVersion = require("./package.json").version;

const contract = function(options = {}) {
  const binary = Schema.normalize(options);

  // Note we don't use `new` here at all. This will cause the class to
  // "mutate" instead of instantiate an instance.
  return Contract.clone(binary);
};

contract.version = truffleContractVersion;

module.exports = contract;

if (typeof window !== "undefined") {
  window.TruffleContract = contract;
}
