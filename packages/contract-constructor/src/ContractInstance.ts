import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { IContractStrategy } from "./contract-strategies/IContractStrategy";

export class ContractInstance {
  // This allows us to dynamically create methods
  [key: string]: any;

  private methods: { [key: string]: any; };

  constructor(
    private _json: { [key: string]: any },
    private readonly strategy: IContractStrategy,
    private readonly contract: ContractAbstraction<ContractProvider>
  ) {
    this.methods = strategy.collectMethods(contract);

    for (const method in this.methods) {
      this[method] = this.methods[method];
    }

    const additionalProperties = strategy.collectAdditionalProperties(contract);
    for (const property in additionalProperties) {
      this[property] = additionalProperties[property];
    }
  }
}