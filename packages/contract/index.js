const Schema = require("@truffle/contract-schema");
const Contract = require("./lib/contract");
const truffleContractVersion = require("./package.json").version;
const TezosContract = require("@truffle/tezos-contract");

const contract = (json = {}, networkType = "ethereum") => {
  const normalizedArtifactObject = Object.assign({}, Schema.normalize(json), {
    networkType
  });

  // Note we don't use `new` here at all. This will cause the class to
  // "mutate" instead of instantiate an instance
  if (networkType === "tezos")
    return TezosContract.clone(normalizedArtifactObject);
  return Contract.clone(normalizedArtifactObject);
};

contract.version = truffleContractVersion;

module.exports = contract;

if (typeof window !== "undefined") {
  window.TruffleContract = contract;
}
