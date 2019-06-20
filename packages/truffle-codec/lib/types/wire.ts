import * as CodecUtils from "truffle-codec-utils";

export interface CalldataDecoding {
  kind: "function" | "constructor" | "fallback" | "unknown";
  class?: CodecUtils.Types.ContractType; //included only if not unknown
  name?: string; //included only if function
  arguments?: AbiArgument[]; //included only if function or constructor
}

export interface EventDecoding {
  name: string;
  class: CodecUtils.Types.ContractType;
  arguments: AbiArgument[];
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  value: CodecUtils.Values.Result;
}
