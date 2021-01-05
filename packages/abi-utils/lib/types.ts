export type Abi = Entry[];

export type Entry =
  | FunctionEntry
  | ConstructorEntry
  | FallbackEntry
  | ReceiveEntry
  | EventEntry
  | ErrorEntry;

export type StateMutability = "pure" | "view" | "nonpayable" | "payable";

export interface FunctionEntry {
  type: "function";
  name: string;
  inputs: Parameter[];
  outputs: Parameter[];
  stateMutability: StateMutability;
}

export interface ConstructorEntry {
  type: "constructor";
  inputs: Parameter[];
  stateMutability: "payable" | "nonpayable";
}

export interface FallbackEntry {
  type: "fallback";
  stateMutability: "payable" | "nonpayable";
}

export interface ReceiveEntry {
  type: "receive";
  stateMutability: "payable";
}

export interface EventEntry {
  type: "event";
  name: string;
  inputs: EventParameter[];
  anonymous: boolean;
}

export interface ErrorEntry {
  type: "error";
  name: string;
  inputs: Parameter[];
}

export interface Parameter {
  name: string;
  type: string;
  // TODO once TS 4.1 is out, we can use template string types
  // Parameter should really be a type union of:
  // - non-tuple parameters that exclude this field
  // - tuple parameters that include this field
  components?: Parameter[];
  internalType?: string;
}

export interface EventParameter extends Parameter {
  indexed: boolean;
}
