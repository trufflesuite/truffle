import debugModule from "debug";
const debug = debugModule("codec:abi-data:utils");

// untyped import since no @types/web3-utils exists
const Web3Utils = require("web3-utils");
import * as Evm from "@truffle/codec/evm";
import * as Ast from "@truffle/codec/ast";
import * as Abi from "@truffle/abi-utils";
import { FunctionAbiBySelectors } from "./types";

export const DEFAULT_CONSTRUCTOR_ABI: Abi.ConstructorEntry = {
  type: "constructor",
  inputs: [],
  stateMutability: "nonpayable"
};

//note the return value only includes functions!
export function computeSelectors(
  abi: Abi.Abi | undefined
): FunctionAbiBySelectors | undefined {
  if (abi === undefined) {
    return undefined;
  }
  return Object.assign(
    {},
    ...abi
      .filter((abiEntry: Abi.Entry) => abiEntry.type === "function")
      .map((abiEntry: Abi.FunctionEntry) => ({
        [abiSelector(abiEntry)]: abiEntry
      }))
  );
}

//does this ABI have a payable fallback (or receive) function?
export function abiHasPayableFallback(
  abi: Abi.Abi | undefined
): boolean | undefined {
  if (abi === undefined) {
    return undefined;
  }
  return abi.some(
    abiEntry =>
      (abiEntry.type === "fallback" || abiEntry.type === "receive") &&
      abiEntry.stateMutability === "payable"
  );
}

//NOTE: this function returns the written out SIGNATURE, not the SELECTOR
export function abiSignature(
  abiEntry: Abi.FunctionEntry | Abi.EventEntry
): string {
  return abiEntry.name + abiTupleSignature(abiEntry.inputs);
}

export function abiTupleSignature(parameters: Abi.Parameter[]): string {
  let components = parameters.map(abiTypeSignature);
  return "(" + components.join(",") + ")";
}

function abiTypeSignature(parameter: Abi.Parameter): string {
  let tupleMatch = parameter.type.match(/tuple(.*)/);
  if (tupleMatch === null) {
    //does not start with "tuple"
    return parameter.type;
  } else {
    let tail = tupleMatch[1]; //everything after "tuple"
    let tupleSignature = abiTupleSignature(parameter.components);
    return tupleSignature + tail;
  }
}

export function abiSelector(
  abiEntry: Abi.FunctionEntry | Abi.EventEntry
): string {
  let signature = abiSignature(abiEntry);
  //NOTE: web3's soliditySha3 has a problem if the empty
  //string is passed in.  Fortunately, that should never happen here.
  let hash = Web3Utils.soliditySha3({ type: "string", value: signature });
  switch (abiEntry.type) {
    case "event":
      return hash;
    case "function":
      return hash.slice(0, 2 + 2 * Evm.Utils.SELECTOR_SIZE); //arithmetic to account for hex string
  }
}

//note: undefined does not match itself :P
export function abisMatch(
  entry1: Abi.Entry | undefined,
  entry2: Abi.Entry | undefined
): boolean {
  //we'll consider two abi entries to match if they have the same
  //type, name (if applicable), and inputs (if applicable).
  //since there's already a signature function, we can just use that.
  if (!entry1 || !entry2) {
    return false;
  }
  if (entry1.type !== entry2.type) {
    return false;
  }
  switch (entry1.type) {
    case "function":
    case "event":
      return (
        abiSignature(entry1) ===
        abiSignature(<Abi.FunctionEntry | Abi.EventEntry>entry2)
      );
    case "constructor":
      return (
        abiTupleSignature(entry1.inputs) ===
        abiTupleSignature((<Abi.ConstructorEntry>entry2).inputs)
      );
    case "fallback":
    case "receive":
      return true;
  }
}

export function definitionMatchesAbi(
  abiEntry: Abi.Entry,
  definition: Ast.AstNode,
  referenceDeclarations: Ast.AstNodes
): boolean {
  try {
    return abisMatch(
      abiEntry,
      Ast.Utils.definitionToAbi(definition, referenceDeclarations)
    );
  } catch (_) {
    return false; //if an exception occurs, well, that's not a match!
  }
}

export function topicsCount(abiEntry: Abi.EventEntry): number {
  let selectorCount = abiEntry.anonymous ? 0 : 1; //if the event is not anonymous, we must account for the selector
  return (
    abiEntry.inputs.filter(({ indexed }) => indexed).length + selectorCount
  );
}

export function abiEntryIsObviouslyIllTyped(abiEntry: Abi.Entry): boolean {
  switch (abiEntry.type) {
    case "fallback":
    case "receive":
      return false;
    case "constructor":
    case "event":
      return abiEntry.inputs.some(abiParameterIsObviouslyIllTyped);
    case "function":
      return (
        abiEntry.inputs.some(abiParameterIsObviouslyIllTyped) ||
        abiEntry.outputs.some(abiParameterIsObviouslyIllTyped)
      );
  }
}

function abiParameterIsObviouslyIllTyped(abiParameter: Abi.Parameter): boolean {
  const legalBaseTypeClasses = [
    "uint",
    "int",
    "fixed",
    "ufixed",
    "bool",
    "address",
    "bytes",
    "string",
    "function",
    "tuple"
  ];
  const baseTypeClass = abiParameter.type.match(/^([a-z]*)/)[1];
  const baseTypeClassIsObviouslyWrong = !legalBaseTypeClasses.includes(
    baseTypeClass
  );
  if (abiParameter.components) {
    return (
      abiParameter.components.some(abiParameterIsObviouslyIllTyped) ||
      baseTypeClassIsObviouslyWrong
    );
  } else {
    return baseTypeClassIsObviouslyWrong;
  }
}

export function abiEntryHasStorageParameters(abiEntry: Abi.Entry): boolean {
  const isStorage = (parameter: Abi.Parameter) =>
    parameter.type.endsWith(" storage");
  return (
    abiEntry.type === "function" &&
    (abiEntry.inputs.some(isStorage) || abiEntry.outputs.some(isStorage))
  );
  //Note the lack of recursion!  Storage parameters can only occur at
  //top level so there's no need to recurse here
  //(they can also only occur for functions)
}
