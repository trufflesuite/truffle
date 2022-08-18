import { Parameter, FunctionEntry, EventEntry, ErrorEntry } from "./types";
import { soliditySha3 } from "web3-utils";

export const ShortSelectorSize = 4;

//NOTE: this function returns the written out SIGNATURE, not the SELECTOR
export function abiSignature(
  abiEntry: FunctionEntry | EventEntry | ErrorEntry
): string {
  return abiEntry.name + abiTupleSignature(abiEntry.inputs);
}

export function abiTupleSignature(parameters: Parameter[]): string {
  const components = parameters.map(abiTypeSignature);
  return "(" + components.join(",") + ")";
}

export function abiTypeSignature(parameter: Parameter): string {
  const tupleMatch = parameter.type.match(/tuple(.*)/);
  if (tupleMatch === null) {
    //does not start with "tuple"
    return parameter.type;
  } else {
    const tail = tupleMatch[1]; //everything after "tuple"
    const tupleSignature = abiTupleSignature(
      parameter.components as Parameter[]
    ); //it won't be undefined
    return tupleSignature + tail;
  }
}

export function abiSelector(
  abiEntry: FunctionEntry | EventEntry | ErrorEntry
): string {
  const signature = abiSignature(abiEntry);
  //NOTE: web3's soliditySha3 has a problem if the empty
  //string is passed in.  Fortunately, that should never happen here.
  const hash = soliditySha3({ type: "string", value: signature }) as string;
  switch (abiEntry.type) {
    case "event":
      return hash;
    case "function":
    case "error":
      return hash.slice(0, 2 + 2 * ShortSelectorSize); //arithmetic to account for hex string
  }
}
