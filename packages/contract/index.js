const Schema = require("@truffle/contract-schema");
const Contract = require("./lib/contract");
const truffleContractVersion = require("./package.json").version;

const contract = (json = {}) => {
  const normalizedArtifactObject = Schema.normalize(json);

  // Note we don't use `new` here at all. This will cause the class to
  // "mutate" instead of instantiate an instance.
  return Contract.clone(normalizedArtifactObject);
};

contract.version = truffleContractVersion;

module.exports = contract;

if (typeof window !== "undefined") {
  window.TruffleContract = contract;
}
