import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { IContractStrategy } from "./contract-strategies/IContractStrategy";
import { CallableObject } from "./contract-strategies/utils";

export class ContractInstance {
  // This allows us to dynamically create methods
  // eslint-disable-next-line no-undef
  [key: string]: any;

  private methods: { [key: string]: CallableObject<object,unknown[],any>; };

  constructor(
    _json: { [key: string]: any },
    strategy: IContractStrategy,
    contract: ContractAbstraction<ContractProvider>
  ) {
    this.methods = strategy.collectMethods(contract, { migrationContract: _json.contractName === "Migrations" });

    for (const method in this.methods) {
      this[method] = this.methods[method];
    }

    const additionalProperties = strategy.collectAdditionalProperties(contract);
    for (const property in additionalProperties) {
      this[property] = additionalProperties[property];
    }
  }
}