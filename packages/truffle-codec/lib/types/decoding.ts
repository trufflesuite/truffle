import * as CodecUtils from "truffle-codec-utils";

export type CalldataDecoding = FunctionDecoding | ConstructorDecoding | MessageDecoding | UnknownDecoding;
export type LogDecoding = EventDecoding | AnonymousDecoding;

export type DecodingMode = "full" | "abi";

export interface FunctionDecoding {
  kind: "function";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  abi: CodecUtils.AbiUtils.FunctionAbiEntry;
  selector: string;
  decodingMode: DecodingMode;
}

export interface ConstructorDecoding {
  kind: "constructor";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  abi: CodecUtils.AbiUtils.ConstructorAbiEntry;
  bytecode: string;
  decodingMode: DecodingMode;
}

export interface MessageDecoding {
  kind: "message";
  class: CodecUtils.Types.ContractType;
  abi: CodecUtils.AbiUtils.FallbackAbiEntry | null; //null indicates no fallback ABI
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
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  abi: CodecUtils.AbiUtils.EventAbiEntry; //should be non-anonymous
  selector: string;
  decodingMode: DecodingMode;
}

export interface AnonymousDecoding {
  kind: "anonymous";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  abi: CodecUtils.AbiUtils.EventAbiEntry; //should be anonymous
  decodingMode: DecodingMode;
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  indexed?: boolean; //included for event parameters
  value: CodecUtils.Values.Result;
}
