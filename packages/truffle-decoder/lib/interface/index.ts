import { AstDefinition } from "../types/ast";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import decode from "../decode";
import TruffleDecoder from "./contract-decoder";
import { ContractObject } from "truffle-contract-schema/spec";

export function forContract(contract: ContractObject, inheritedContracts: ContractObject[], providerUrl: string): TruffleDecoder {
  return new TruffleDecoder(contract, inheritedContracts, providerUrl);
}

export function forEvmState(definition: AstDefinition, pointer: DataPointer, info: EvmInfo, providerUrl?: string): any {
  return decode(definition, pointer, info);
}