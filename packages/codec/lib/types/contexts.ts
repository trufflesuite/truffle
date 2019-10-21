import * as AbiTypes from "./abi";
import { ContractKind } from "./ast";
import { CompilerVersion } from "./compiler";

export type Contexts = DecoderContexts | DebuggerContexts;

export type Context = DecoderContext | DebuggerContext;

export interface DecoderContexts {
  [context: string]: DecoderContext;
}

export interface DebuggerContexts {
  [context: string]: DebuggerContext;
}

export interface DecoderContext {
  context: string; //The context hash
  binary: string; //this should (for now) be the normalized binary, with "."s
  //in place of link references or other variable parts; this will probably
  //change in the future
  isConstructor: boolean;
  contractName?: string;
  contractId?: number;
  contractKind?: ContractKind; //note: should never be "interface"
  abi?: AbiTypes.FunctionAbiBySelectors;
  payable?: boolean;
  hasFallback?: boolean; //used just by the calldata decoder...
  compiler?: CompilerVersion;
}

export interface DebuggerContext {
  context: string; //The context hash
  binary: string; //this should (for now) be the normalized binary, with "."s
  //in place of link references or other variable parts; this will probably
  //change in the future
  isConstructor: boolean;
  contractName?: string;
  contractId?: number;
  contractKind?: ContractKind; //note: should never be "interface"
  abi?: AbiTypes.Abi;
  sourceMap?: string;
  primarySource?: number;
  compiler?: CompilerVersion;
  payable?: boolean;
}
