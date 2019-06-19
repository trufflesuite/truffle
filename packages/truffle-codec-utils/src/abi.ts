import debugModule from "debug";
const debug = debugModule("codec-utils:abi");

import { Abi as SchemaAbi } from "truffle-contract-schema/spec";
import { EVM as EVMUtils } from "./evm";
import { AstDefinition, AstReferences } from "./ast";
import { Definition as DefinitionUtils } from "./definition";
import Web3 from "web3";

//NOTE: SchemaAbi is kind of loose and a pain to use.
//So we'll generally coerce things to Abi before use.

export namespace AbiUtils {

  export type Abi = AbiEntry[];

  export type AbiEntry = FunctionAbiEntry | ConstructorAbiEntry | FallbackAbiEntry | EventAbiEntry;

  export interface FunctionAbiEntry {
    type: "function";
    name: string;
    inputs: AbiParameter[];
    outputs: AbiParameter[];
    stateMutability?: "payable" | "nonpayable" | "view" | "pure"; //only in newer ones
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
  }

  export interface FunctionAbiEntryWithSelector extends FunctionAbiEntry {
    signature: string; //note: this should be the SELECTOR,
    //not the written-out signature.  it's called "signature"
    //for compatibility.
  }

  export interface EventAbiEntryWithSelector extends EventAbiEntry {
    signature: string; //note: this should be the SELECTOR,
    //not the written-out signature.  it's called "signature"
    //for compatibility.
  }

  export type AbiEntryWithSelector = FunctionAbiEntryWithSelector | EventAbiEntryWithSelector;

  export interface AbiBySelectors {
    [selector: string]: AbiEntryWithSelector
    //note this necessary excludes constructor/fallback
  }

  export function computeSelectors(abiLoose: Abi | SchemaAbi | undefined): AbiBySelectors | undefined {
    if(abiLoose === undefined) {
      return undefined;
    }
    const abi = <Abi>abiLoose;
    return Object.assign({},
      ...abi.filter(
        (abiEntry: AbiEntry) => abiEntry.type === "function" || abiEntry.type === "event"
      ).map(
        (abiEntry: FunctionAbiEntry | EventAbiEntry) => {
          let signature = abiSelector(abiEntry);
          return {
            [signature]: {
              ...abiEntry,
              signature
            }
          };
        }
      )
    )
  }

  //does this ABI have a payable fallback function?
  export function isABIPayable(abiLoose: Abi | SchemaAbi | undefined): boolean | undefined {
    if(abiLoose === undefined) {
      return undefined;
    }
    const abi = <Abi> abiLoose;
    return abi.some(
      (abiEntry: AbiEntry) =>
        abiEntry.type === "fallback" && abiMutability(abiEntry) === "payable"
    );
  }

  //shim for old abi versions
  function abiMutability(abiEntry: FunctionAbiEntry | ConstructorAbiEntry | FallbackAbiEntry): "pure" | "view" | "nonpayable" | "payable" {
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

  export function matchesAbi(abiEntry: AbiEntry, node: AstDefinition, referenceDeclarations: AstReferences): boolean {
    //first: does the basic name and type match?
    switch(node.nodeType) {
      case "FunctionDefinition":
        if(node.visibility !== "external" && node.visibility !== "public") {
          return false;
        }
        if(abiEntry.type !== DefinitionUtils.functionKind(node)) {
          return false;
        }
	if(abiEntry.type === "function") {
	  if(node.name !== abiEntry.name) {
	    return false;
	  }
	}
        break;
      case "EventDefinition":
        if(abiEntry.type !== "event") {
          return false;
        }
	if(node.name !== abiEntry.name) {
	  return false;
	}
        break;
      default:
        return false;
    }
    //if it's a fallback function, we're done
    if(abiEntry.type === "fallback") {
      return true;
    }
    //otherwise, we've got to start checking input types (we don't check output types)
    return matchesAbiParameters(abiEntry.inputs, node.parameters.parameters, referenceDeclarations);
  }

  function matchesAbiParameters(abiParameters: AbiParameter[], nodeParameters: AstDefinition[], referenceDeclarations: AstReferences): boolean {
    if(abiParameters.length !== nodeParameters.length) {
      return false;
    }
    for(let i = 0; i < abiParameters.length; i++) {
      if(!matchesAbiType(abiParameters[i], nodeParameters[i], referenceDeclarations)) {
        return false;
      }
    }
    return true;
  }

  //TODO: add error-handling
  function matchesAbiType(abiParameter: AbiParameter, nodeParameter: AstDefinition, referenceDeclarations: AstReferences): boolean {
    if(DefinitionUtils.toAbiType(nodeParameter, referenceDeclarations) !== abiParameter.type) {
      return false;
    }
    if(abiParameter.type.startsWith("tuple")) {
      let referenceDeclaration = referenceDeclarations[DefinitionUtils.typeId(nodeParameter)];
      return matchesAbiParameters(abiParameter.components, referenceDeclaration.members, referenceDeclarations);
    }
    else {
      return true;
    }
  }

  //NOTE: this function returns the written out SIGNATURE, not the SELECTOR
  function abiSignature(abiEntry: FunctionAbiEntry | EventAbiEntry): string {
    return abiEntry.name + abiTupleSignature(abiEntry.inputs);
  }

  function abiTupleSignature(parameters: AbiParameter[]): string {
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
    //first, try reading it from the entry; only recompute if needed
    let storedSelector = (<AbiEntryWithSelector>abiEntry).signature;
    if(storedSelector !== undefined) {
      return storedSelector;
    }
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

}
