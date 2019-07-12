import * as CodecUtils from "truffle-codec-utils";

export type CalldataDecoding = FunctionDecoding | ConstructorDecoding | FallbackDecoding | UnknownDecoding;
export type LogDecoding = EventDecoding | AnonymousDecoding;

export type DecodingMode = "full" | "abi";

export interface FunctionDecoding {
  kind: "function";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  selector: string;
  decodingMode: DecodingMode;
}

export interface ConstructorDecoding {
  kind: "constructor";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  bytecode: string;
  decodingMode: DecodingMode;
}

export interface FallbackDecoding {
  kind: "fallback";
  class: CodecUtils.Types.ContractType;
  data: string;
  decodingMode: DecodingMode;
}

export interface UnknownDecoding {
  kind: "unknown";
  decodingMode: DecodingMode;
}

export interface EventDecoding {
  kind: "event";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  selector: string;
  decodingMode: DecodingMode;
}

export interface AnonymousDecoding {
  kind: "anonymous";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  decodingMode: DecodingMode;
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  indexed?: boolean; //included for event parameters
  value: CodecUtils.Values.Result;
}
