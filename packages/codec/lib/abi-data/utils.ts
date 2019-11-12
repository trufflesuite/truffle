import debugModule from "debug";
const debug = debugModule("codec:abi-data:utils");

// untyped import since no @types/web3-utils exists
import Web3Utils from "web3-utils";
import { Abi as SchemaAbi } from "truffle-contract-schema/spec";
import * as Evm from "@truffle/codec/evm";
import * as Common from "@truffle/codec/common";
import * as Ast from "@truffle/codec/ast";
import * as Abi from "./types";

//NOTE: SchemaAbi is kind of loose and a pain to use.
//So we'll generally coerce things to Abi before use.
//(we combine this with adding a "function" tag for
//entries that lack it)

export const DEFAULT_CONSTRUCTOR_ABI: Abi.ConstructorAbiEntry = {
  type: "constructor",
  inputs: [],
  stateMutability: "nonpayable",
  payable: false
};

export const DEFAULT_FALLBACK_ABI: Abi.FallbackAbiEntry = {
  type: "fallback",
  stateMutability: "nonpayable",
  payable: false
};

export function schemaAbiToAbi(abiLoose: SchemaAbi): Abi.Abi {
  return abiLoose.map(
    entry =>
      entry.type
        ? <Abi.AbiEntry>entry
        : <Abi.AbiEntry>{ type: "function", ...entry }
  );
}

//note the return value only includes functions!
export function computeSelectors(
  abi: Abi.Abi | undefined
): Abi.FunctionAbiBySelectors | undefined {
  if (abi === undefined) {
    return undefined;
  }
  return Object.assign(
    {},
    ...abi
      .filter((abiEntry: Abi.AbiEntry) => abiEntry.type === "function")
      .map((abiEntry: Abi.FunctionAbiEntry) => ({
        [abiSelector(abiEntry)]: abiEntry
      }))
  );
}

//does this ABI have a payable fallback function?
export function abiHasPayableFallback(
  abi: Abi.Abi | undefined
): boolean | undefined {
  if (abi === undefined) {
    return undefined;
  }
  return abiMutability(getFallbackEntry(abi)) === "payable";
}

export function abiHasFallback(abi: Abi.Abi) {
  return abi.some((abiEntry: Abi.AbiEntry) => abiEntry.type === "fallback");
}

//gets the fallback entry; if there isn't one, returns a default one
export function getFallbackEntry(abi: Abi.Abi): Abi.FallbackAbiEntry {
  //no idea why TS's type inference is failing on this one...
  return (
    <Abi.FallbackAbiEntry>abi.find(abiEntry => abiEntry.type === "fallback") ||
    DEFAULT_FALLBACK_ABI
  );
}

export function fallbackAbiForPayability(
  payable: boolean
): Abi.FallbackAbiEntry {
  return {
    type: "fallback",
    stateMutability: payable ? "payable" : "nonpayable",
    payable
  };
}

//shim for old abi versions
function abiMutability(
  abiEntry:
    | Abi.FunctionAbiEntry
    | Abi.ConstructorAbiEntry
    | Abi.FallbackAbiEntry
): Common.Mutability {
  if (abiEntry.stateMutability !== undefined) {
    return abiEntry.stateMutability;
  }
  if (abiEntry.payable) {
    return "payable";
  }
  if (abiEntry.type === "function" && abiEntry.constant) {
    return "view";
  }
  return "nonpayable";
}

//NOTE: this function returns the written out SIGNATURE, not the SELECTOR
export function abiSignature(
  abiEntry: Abi.FunctionAbiEntry | Abi.EventAbiEntry
): string {
  return abiEntry.name + abiTupleSignature(abiEntry.inputs);
}

export function abiTupleSignature(parameters: Abi.AbiParameter[]): string {
  let components = parameters.map(abiTypeSignature);
  return "(" + components.join(",") + ")";
}

function abiTypeSignature(parameter: Abi.AbiParameter): string {
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
  abiEntry: Abi.FunctionAbiEntry | Abi.EventAbiEntry
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
  entry1: Abi.AbiEntry | undefined,
  entry2: Abi.AbiEntry | undefined
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
        abiSignature(<Abi.FunctionAbiEntry | Abi.EventAbiEntry>entry2)
      );
    case "constructor":
      return (
        abiTupleSignature(entry1.inputs) ===
        abiTupleSignature((<Abi.ConstructorAbiEntry>entry2).inputs)
      );
    case "fallback":
      return true;
  }
}

export function definitionMatchesAbi(
  abiEntry: Abi.AbiEntry,
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

export function topicsCount(abiEntry: Abi.EventAbiEntry): number {
  let selectorCount = abiEntry.anonymous ? 0 : 1; //if the event is not anonymous, we must account for the selector
  return (
    abiEntry.inputs.filter(({ indexed }) => indexed).length + selectorCount
  );
}
