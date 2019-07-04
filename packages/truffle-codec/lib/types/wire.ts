import * as CodecUtils from "truffle-codec-utils";

export type CalldataDecoding = FunctionDecoding | ConstructorDecoding | FallbackDecoding | UnknownDecoding;
export type LogDecoding = EventDecoding | AnonymousDecoding;

export interface FunctionDecoding {
  kind: "function";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  selector: string;
}

export interface ConstructorDecoding {
  kind: "constructor";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  bytecode: string;
}

export interface FallbackDecoding {
  kind: "fallback";
  class: CodecUtils.Types.ContractType;
  data: string;
}

export interface UnknownDecoding {
  kind: "unknown";
}

export interface EventDecoding {
  kind: "event";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
  selector: string;
}

export interface AnonymousDecoding {
  kind: "anonymous";
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
  name: string;
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  indexed?: boolean; //included for event parameters
  value: CodecUtils.Values.Result;
}
