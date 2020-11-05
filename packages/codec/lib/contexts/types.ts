import * as Abi from "@truffle/abi-utils";
import * as AbiData from "@truffle/codec/abi-data/types";
import * as Common from "@truffle/codec/common";
import * as Compiler from "@truffle/codec/compiler";
import { ImmutableReferences } from "@truffle/contract-schema/spec";

export interface Contexts {
  [context: string]: Context;
}

export interface Context {
  context: string; //The context hash
  binary: string; //this should (for now) be the normalized binary, with "."s
  //in place of link references or other variable parts; this will probably
  //change in the future
  isConstructor: boolean;
  immutableReferences?: ImmutableReferences; //never included for a constructor
  contractName?: string;
  contractId?: number;
  linearizedBaseContracts?: number[];
  contractKind?: Common.ContractKind; //note: should never be "interface"
  abi?: AbiData.FunctionAbiBySelectors;
  payable?: boolean;
  fallbackAbi?: {
    //used only by the calldata decoder
    fallback: Abi.FallbackEntry | null; //set to null if none
    receive: Abi.ReceiveEntry | null; //set to null if none
  };
  compiler?: Compiler.CompilerVersion;
  compilationId?: string;
}

//NOTE: this is being kept for reference (the debugger is JS and can't import
//types), but we don't actually use this type anywhere anymore.
export interface DebuggerContext {
  context: string; //The context hash
  binary: string; //this should (for now) be the normalized binary, with "."s
  //in place of link references or other variable parts; this will probably
  //change in the future
  isConstructor: boolean;
  immutableReferences?: ImmutableReferences; //never included for a constructor
  contractName?: string;
  contractId?: number;
  linearizedBaseContracts?: number[];
  contractKind?: Common.ContractKind; //note: should never be "interface"
  abi?: Abi.Abi;
  sourceMap?: string;
  primarySource?: number;
  compiler?: Compiler.CompilerVersion;
  compilationId?: string;
  payable?: boolean;
}
