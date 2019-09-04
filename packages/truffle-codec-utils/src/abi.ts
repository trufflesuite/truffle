import debugModule from "debug";
const debug = debugModule("codec-utils:abi");

import { Abi as SchemaAbi } from "truffle-contract-schema/spec";
import { EVM as EVMUtils } from "./evm";
import { AstDefinition, AstReferences, Mutability } from "./ast";
import { definitionToAbi } from "./definition2abi";
import Web3 from "web3";

//NOTE: SchemaAbi is kind of loose and a pain to use.
//So we'll generally coerce things to Abi before use.
//(we combine this with adding a "function" tag for
//entries that lack it)

export namespace AbiUtils {

  export type Abi = AbiEntry[];

  export type AbiEntry = FunctionAbiEntry | ConstructorAbiEntry | FallbackAbiEntry | EventAbiEntry;

  export interface FunctionAbiEntry {
    type: "function";
    name: string;
    inputs: AbiParameter[];
    outputs: AbiParameter[];
    stateMutability?: Mutability; //only in newer ones
    constant?: boolean; //only in older ones
    payable?: boolean; //only in older ones
  }

  export interface ConstructorAbiEntry {
    type: "constructor";
    inputs: AbiParameter[];
    stateMutability?: "payable" | "nonpayable"; //only in newer ones
    payable?: boolean; //only in older ones
  }

  export interface FallbackAbiEntry {
    type: "fallback";
    stateMutability?: "payable" | "nonpayable"; //only in newer ones
    payable?: boolean; //only in older ones
  }

  export interface EventAbiEntry {
    type: "event";
    name: string;
    inputs: AbiParameter[];
    anonymous: boolean;
  }

  export interface AbiParameter {
    name: string;
    type: string;
    indexed?: boolean; //only present for inputs
    components?: AbiParameter[]; //only preset for tuples (structs)
    internalType?: string;
  }

  export interface FunctionAbiBySelectors {
    [selector: string]: FunctionAbiEntry
  }

  export const DEFAULT_CONSTRUCTOR_ABI: ConstructorAbiEntry = {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
    payable: false
  };

  export const DEFAULT_FALLBACK_ABI: FallbackAbiEntry = {
    type: "fallback",
    stateMutability: "nonpayable",
    payable: false
  };

  export function schemaAbiToAbi(abiLoose: SchemaAbi): Abi {
    return abiLoose.map(
      entry => entry.type
        ? <AbiEntry> entry
        : <AbiEntry> {type: "function", ...entry}
    );
  }

  //note the return value only includes functions!
  export function computeSelectors(abi: Abi | undefined): FunctionAbiBySelectors | undefined {
    if(abi === undefined) {
      return undefined;
    }
    return Object.assign({},
      ...abi.filter(
        (abiEntry: AbiEntry) => abiEntry.type === "function"
      ).map(
        (abiEntry: FunctionAbiEntry) => ({ [abiSelector(abiEntry)]: abiEntry })
      )
    )
  }

  //does this ABI have a payable fallback function?
  export function abiHasPayableFallback(abi: Abi | undefined): boolean | undefined {
    if(abi === undefined) {
      return undefined;
    }
    return abiMutability(getFallbackEntry(abi)) === "payable";
  }

  export function abiHasFallback(abi: Abi) {
    return abi.some((abiEntry: AbiEntry) => abiEntry.type === "fallback");
  }

  //gets the fallback entry; if there isn't one, returns a default one
  export function getFallbackEntry(abi: Abi): FallbackAbiEntry {
    //no idea why TS's type inference is failing on this one...
    return <FallbackAbiEntry> abi.find(abiEntry => abiEntry.type === "fallback") || DEFAULT_FALLBACK_ABI;
  }

  export function fallbackAbiForPayability(payable: boolean): FallbackAbiEntry {
    return {
      type: "fallback",
      stateMutability: payable ? "payable" : "nonpayable",
      payable
    };
  }

  //shim for old abi versions
  function abiMutability(abiEntry: FunctionAbiEntry | ConstructorAbiEntry | FallbackAbiEntry): Mutability {
    if(abiEntry.stateMutability !== undefined) {
      return abiEntry.stateMutability;
    }
    if(abiEntry.payable) {
      return "payable";
    }
    if(abiEntry.type === "function" && abiEntry.constant) {
      return "view";
    }
    return "nonpayable";
  }

  //NOTE: this function returns the written out SIGNATURE, not the SELECTOR
  export function abiSignature(abiEntry: FunctionAbiEntry | EventAbiEntry): string {
    return abiEntry.name + abiTupleSignature(abiEntry.inputs);
  }

  export function abiTupleSignature(parameters: AbiParameter[]): string {
    let components = parameters.map(abiTypeSignature);
    return "(" + components.join(",") + ")";
  }

  function abiTypeSignature(parameter: AbiParameter): string {
    let tupleMatch = parameter.type.match(/tuple(.*)/);
    if(tupleMatch === null) { //does not start with "tuple"
      return parameter.type;
    }
    else {
      let tail = tupleMatch[1]; //everything after "tuple"
      let tupleSignature = abiTupleSignature(parameter.components);
      return tupleSignature + tail;
    }
  }

  export function abiSelector(abiEntry: FunctionAbiEntry | EventAbiEntry): string {
    let signature = abiSignature(abiEntry);
    //NOTE: web3's soliditySha3 has a problem if the empty
    //string is passed in.  Fortunately, that should never happen here.
    let hash = Web3.utils.soliditySha3({type: "string", value: signature});
    switch(abiEntry.type) {
      case "event":
        return hash;
      case "function":
        return hash.slice(0, 2 + 2 * EVMUtils.SELECTOR_SIZE); //arithmetic to account for hex string
    }
  }

  //note: undefined does not match itself :P
  export function abisMatch(entry1: AbiEntry | undefined, entry2: AbiEntry | undefined): boolean {
    //we'll consider two abi entries to match if they have the same
    //type, name (if applicable), and inputs (if applicable).
    //since there's already a signature function, we can just use that.
    if(!entry1 || !entry2) {
      return false;
    }
    if(entry1.type !== entry2.type) {
      return false;
    }
    switch(entry1.type) {
      case "function":
      case "event":
        return abiSignature(entry1) === abiSignature(<FunctionAbiEntry|EventAbiEntry>entry2);
      case "constructor":
        return abiTupleSignature(entry1.inputs) === abiTupleSignature((<ConstructorAbiEntry>entry2).inputs);
      case "fallback":
        return true;
    }
  }

  export function definitionMatchesAbi(abiEntry: AbiEntry, definition: AstDefinition, referenceDeclarations: AstReferences): boolean {
    return abisMatch(abiEntry, definitionToAbi(definition, referenceDeclarations));
  }

  export function topicsCount(abiEntry: EventAbiEntry): number {
    let selectorCount = abiEntry.anonymous ? 0 : 1; //if the event is not anonymous, we must account for the selector
    return abiEntry.inputs.filter(({ indexed }) => indexed).length + selectorCount;
  }
}
