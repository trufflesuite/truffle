import * as Common from "@truffle/codec/common";

export type Abi = AbiEntry[];

export type AbiEntry =
  | FunctionAbiEntry
  | ConstructorAbiEntry
  | FallbackAbiEntry
  | ReceiveAbiEntry
  | EventAbiEntry;

export interface FunctionAbiEntry {
  type: "function";
  name: string;
  inputs: AbiParameter[];
  outputs: AbiParameter[];
  stateMutability?: Common.Mutability; //only in newer ones
  constant?: boolean; //only in older ones
  payable?: boolean; //only in older ones
}

export interface ConstructorAbiEntry {
  type: "constructor";
  inputs: AbiParameter[];
  stateMutability?: "payable" | "nonpayable"; //only in newer ones
  payable?: boolean; //only in older ones
}

export interface FallbackAbiEntry {
  type: "fallback";
  stateMutability?: "payable" | "nonpayable"; //only in newer ones
  payable?: boolean; //only in older ones
}

export interface ReceiveAbiEntry {
  type: "receive";
  stateMutability?: "payable";
  payable?: boolean; //will never actually be present -- receive was
  //introduced in 0.6.0, after this field was removed -- but included
  //to keep typings simpler elsewhere
}

export interface EventAbiEntry {
  type: "event";
  name: string;
  inputs: AbiParameter[];
  anonymous: boolean;
}

export interface AbiParameter {
  name: string;
  type: string;
  indexed?: boolean; //only present for inputs
  components?: AbiParameter[]; //only preset for tuples (structs)
  internalType?: string;
}

export interface FunctionAbiBySelectors {
  [selector: string]: FunctionAbiEntry;
}
