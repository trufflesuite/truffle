import { AstDefinition } from "../types/ast";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import decode from "../decode";
import TruffleDecoder from "./decoder";
import { TruffleContractInstance } from "truffle-contract";

export function forContract(contract: TruffleContractInstance, inheritedContracts: TruffleContractInstance[], providerUrl: string): TruffleDecoder {
  return new TruffleDecoder(contract, inheritedContracts, providerUrl);
}

export function forEvmState(definition: AstDefinition, pointer: DataPointer, info: EvmInfo, providerUrl?: string): any {
  return decode(definition, pointer, info);
}