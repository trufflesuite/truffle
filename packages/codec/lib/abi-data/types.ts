import { FunctionEntry } from "@truffle/abi-utils";

export interface FunctionAbiBySelectors {
  [selector: string]: FunctionEntry;
}
