import debugModule from "debug";
const debug = debugModule("codec-utils:abi");

import { Abi as SchemaAbi } from "truffle-contract-schema/spec";
import { EVM as EVMUtils } from "./evm";
import { AstDefinition, AstReferences } from "./ast";
import { Definition as DefinitionUtils } from "./definition";
import { Values } from "./types/values";
import { UnknownUserDefinedTypeError } from "./errors";
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

  function matchesAbiType(abiParameter: AbiParameter, nodeParameter: AstDefinition, referenceDeclarations: AstReferences): boolean {
    if(toAbiType(nodeParameter, referenceDeclarations) !== abiParameter.type) {
      return false;
    }
    if(abiParameter.type.startsWith("tuple")) {
      let referenceId = DefinitionUtils.typeId(nodeParameter);
      let referenceDeclaration = referenceDeclarations[referenceId];
      if(referenceDeclaration === undefined) {
        let typeString = DefinitionUtils.typeString(nodeParameter);
        throw new UnknownUserDefinedTypeError(referenceId, typeString);
      }
      return matchesAbiParameters(abiParameter.components, referenceDeclaration.members, referenceDeclarations);
    }
    else {
      return true;
    }
  }

  //note: this is only meant for types that can go in the ABI
  //it returns how that type is notated in the ABI -- just the string,
  //to be clear, not components of tuples
  function toAbiType(definition: AstDefinition, referenceDeclarations: AstReferences): string {
    let basicType = DefinitionUtils.typeClassLongForm(definition); //get that whole first segment!
    switch(basicType) {
      case "contract":
        return "address";
      case "struct":
        return "tuple"; //the more detailed checking will be handled elsewhere
      case "enum":
        let referenceId = DefinitionUtils.typeId(definition);
        let referenceDeclaration = referenceDeclarations[referenceId];
        if(referenceDeclaration === undefined) {
          let typeString = DefinitionUtils.typeString(definition);
          throw new UnknownUserDefinedTypeError(referenceId, typeString);
        }
        let numOptions = referenceDeclaration.members.length;
        let bits = 8 * Math.ceil(Math.log2(numOptions) / 8);
        return `uint${bits}`;
      case "array":
        let baseType = toAbiType(DefinitionUtils.baseDefinition(definition), referenceDeclarations);
        return DefinitionUtils.isDynamicArray(definition)
          ? `${baseType}[]`
          : `${baseType}[${DefinitionUtils.staticLength(definition)}]`;
      default:
        return basicType;
        //note that: int/uint/fixed/ufixed/bytes will have their size and such left on;
        //address will have "payable" left off;
        //external functions will be reduced to "function" (and internal functions shouldn't
        //be passed in!)
        //(mappings shouldn't be passed in either obviously)
    }
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

  export function topicsCount(abiEntry: EventAbiEntry): number {
    let selectorCount = abiEntry.anonymous ? 0 : 1; //if the event is not anonymous, we must account for the selector
    return abiEntry.inputs.filter(({ indexed }) => indexed).length + selectorCount;
  }
}
