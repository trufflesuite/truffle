import { ContractInstance } from "../ContractInstance";
import { PrepareCallSettings, TxParams } from "./types";

export interface IContractStrategy {
  interfaceAdapter: any;
  defaults: { [key: string]: any }

  deploy(txArguments: any[], txParams: TxParams): Promise<ContractInstance>;
  at(address: string): Promise<ContractInstance>;

  prepareCall(args: any[], settings?: PrepareCallSettings): [any[], { [key: string]: any }];
  // sendTransaction(): any;
  // call(): any;

  collectMethods(contractInstance: any): { [key: string]: any; };
  collectAdditionalProperties(contractInstance: any): { [key: string]: any; };

  estimateGasNew(txArgs: any[], txParams: { [key: string]: any }): any;
}