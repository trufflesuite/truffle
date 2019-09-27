import { DecoderContext } from "./contexts";
import * as AbiTypes from "./abi";
import { Types } from "../format/types";
import { Values } from "../format/values";

export type CalldataDecoding = FunctionDecoding | ConstructorDecoding | MessageDecoding | UnknownDecoding;
export type LogDecoding = EventDecoding | AnonymousDecoding;

export type DecodingMode = "full" | "abi";

export interface FunctionDecoding {
  kind: "function";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: AbiTypes.FunctionAbiEntry;
  selector: string;
  decodingMode: DecodingMode;
}

export interface ConstructorDecoding {
  kind: "constructor";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: AbiTypes.ConstructorAbiEntry;
  bytecode: string;
  decodingMode: DecodingMode;
}

export interface MessageDecoding {
  kind: "message";
  class: Types.ContractType;
  abi: AbiTypes.FallbackAbiEntry | null; //null indicates no fallback ABI
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
  abi: AbiTypes.EventAbiEntry; //should be non-anonymous
  selector: string;
  decodingMode: DecodingMode;
}

export interface AnonymousDecoding {
  kind: "anonymous";
  class: Types.ContractType;
  arguments: AbiArgument[];
  abi: AbiTypes.EventAbiEntry; //should be anonymous
  decodingMode: DecodingMode;
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  indexed?: boolean; //included for event parameters
  value: Values.Result;
}

//the following types are intended for internal use only
export interface ContractInfoAndContext {
  contractInfo: Values.ContractValueInfo;
  context?: DecoderContext;
}
