import BN from "bn.js";

import { Abi } from "@truffle/codec/types";
import { Types, Values } from "@truffle/codec/format";

export type CalldataDecoding = FunctionDecoding | ConstructorDecoding | MessageDecoding | UnknownDecoding;
export type LogDecoding = EventDecoding | AnonymousDecoding;

export type DecodingMode = "full" | "abi";

export interface FunctionDecoding {
  kind: "function";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: Abi.FunctionAbiEntry;
  selector: string;
  decodingMode: DecodingMode;
}

export interface ConstructorDecoding {
  kind: "constructor";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: Abi.ConstructorAbiEntry;
  bytecode: string;
  decodingMode: DecodingMode;
}

export interface MessageDecoding {
  kind: "message";
  class: Types.ContractType;
  abi: Abi.FallbackAbiEntry | null; //null indicates no fallback ABI
  data: string;
  decodingMode: DecodingMode;
}

export interface UnknownDecoding {
  kind: "unknown";
  decodingMode: DecodingMode;
  data: string;
}

export interface EventDecoding {
  kind: "event";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: Abi.EventAbiEntry; //should be non-anonymous
  selector: string;
  decodingMode: DecodingMode;
}

export interface AnonymousDecoding {
  kind: "anonymous";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: Abi.EventAbiEntry; //should be anonymous
  decodingMode: DecodingMode;
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  indexed?: boolean; //included for event parameters
  value: Values.Result;
}

export type DecoderRequest = StorageRequest | CodeRequest;

export interface StorageRequest {
  type: "storage";
  slot: BN; //will add more fields as needed
}

export interface CodeRequest {
  type: "code";
  address: string;
}

export interface DecoderOptions {
  permissivePadding?: boolean; //allows incorrect padding on certain data types
  strictAbiMode?: boolean; //throw errors instead of returning; check array & string lengths (crudely)
  allowRetry?: boolean; //turns on error-throwing for retry-allowed errors only
  abiPointerBase?: number;
  memoryVisited?: number[]; //for the future
}
