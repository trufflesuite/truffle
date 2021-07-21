const oldContract = require("@truffle/contract");
import Schema from "@truffle/contract-schema";
import { ContractConstructor } from "./ContractConstructor";

const contract = (json = {}, config: any): ContractConstructor => {
  const normalizedArtifactObject = Schema.normalize(json);

  // Interceptor to call the old contract for solidity
  return normalizedArtifactObject.architecture === "tezos"
    ? new ContractConstructor(normalizedArtifactObject, config)
    : oldContract(json);
};

export { contract };