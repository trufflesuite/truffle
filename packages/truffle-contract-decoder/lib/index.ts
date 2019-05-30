import debugModule from "debug";
const debug = debugModule("decoder:interface:contract-decoder");

import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { Definition as DefinitionUtils, EVM, AstDefinition, AstReferences } from "truffle-decode-utils";
import { BlockType, Transaction } from "web3/eth/types";
import { EventLog, Log } from "web3/types";
import { Provider } from "web3/providers";
import abiDecoder from "abi-decoder";
import isEqual from "lodash.isequal"; //util.isDeepStrictEqual doesn't exist in Node 8
import * as Decoder from "truffle-decoder";
import * as DecoderTypes from "./types";
import * as Utils from "./utils";

export function forContract(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address?: string): TruffleContractDecoder {
  return new TruffleContractDecoder(contract, relevantContracts, provider, address);
}

export default class TruffleContractDecoder extends AsyncEventEmitter {
  private web3: Web3;

  private contract: ContractObject;
  private contractNode: AstDefinition;
  private contractNetwork: string;
  private contractAddress: string;
  private contractCode: string;
  private relevantContracts: ContractObject[];

  private contracts: DecoderTypes.ContractMapping = {};
  private contractNodes: AstReferences = {};
  private contexts: DecodeUtils.Contexts.DecoderContexts = {};
  private context: DecodeUtils.Contexts.DecoderContext;

  private referenceDeclarations: AstReferences;
  private userDefinedTypes: Types.TypesById;
  private storageAllocations: Decoder.StorageAllocations;

  private eventDefinitions: AstReferences;
  private eventDefinitionIdsByName: {
    [name: string]: number
  };

  private stateVariableReferences: Decoder.StorageMemberAllocations;

  private mappingKeys: Decoder.Slot[] = [];

  private storageCache: DecoderTypes.StorageCache = {};
  private codeCache: DecoderTypes.CodeCache = {};

  constructor(contract: ContractObject, relevantContracts: ContractObject[], provider: Provider, address: string) {
    super();

    this.web3 = new Web3(provider);

    this.contract = contract;
    this.relevantContracts = relevantContracts;

    if(address !== undefined) {
      this.contractAddress = address;
    }
    this.contractNode = Utils.getContractNode(this.contract);
    if(this.contractNode === undefined) {
      throw new DecoderTypes.ContractBeingDecodedHasNoNodeError();
    }

    this.contracts[this.contractNode.id] = this.contract;
    this.contractNodes[this.contractNode.id] = this.contractNode;
    if(this.contract.deployedBinary) { //just to be safe
      this.context = this.makeContext(this.contract, this.contractNode);
      this.contexts[this.contractNode.id] = this.context;
    }
    abiDecoder.addABI(this.contract.abi);

    for(let relevantContract of this.relevantContracts) {
      abiDecoder.addABI(relevantContract.abi);
      let node: AstDefinition = Utils.getContractNode(relevantContract);
      if(node !== undefined) {
        this.contracts[node.id] = relevantContract;
        this.contractNodes[node.id] = node;
        if(relevantContract.deployedBinary) {
          this.contexts[node.id] = this.makeContext(relevantContract, node);
        }
      }
    }

    this.contexts = <DecodeUtils.Contexts.DecoderContexts>DecodeUtils.Contexts.normalizeContexts(this.contexts);
  }

  private makeContext(contract: ContractObject, node: AstDefinition) {
    //we want the non-constructor context here
    return {
      contractName: contract.contractName,
      binary: contract.deployedBytecode,
      contractId: node.id,
      contractKind: node.contractKind,
      isConstructor: false,
      abi: DecodeUtils.Contexts.abiToFunctionAbiWithSignatures(contract.abi),
      payable: DecodeUtils.Contexts.isABIPayable(contract.abi)
    };
  }

  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();
    if(this.contractAddress === undefined) {
      this.contractAddress = this.contract.networks[this.contractNetwork].address;
    }

    debug("init called");
    this.referenceDeclarations = Utils.getReferenceDeclarations(Object.values(this.contractNodes));
    this.userDefinedTypes = Types.definitionsToStoredTypes(this.referenceDeclarations);

    this.eventDefinitions = Utils.getEventDefinitions(Object.values(this.contractNodes));
    this.eventDefinitionIdsByName = {};
    for (let id in this.eventDefinitions) {
      this.eventDefinitionIdsByName[this.eventDefinitions[id].name] = parseInt(id);
        //this parseInt shouldn't be necessary, but TypeScript refuses to believe
        //that id must be a number even though the definition of AstReferences
        //says so
    }
    debug("done with event definitions");

    this.storageAllocations = Decoder.getStorageAllocations(this.referenceDeclarations, {[this.contractNode.id]: this.contractNode});
    debug("done with allocation");
    this.stateVariableReferences = this.storageAllocations[this.contractNode.id].members;
    debug("stateVariableReferences %O", this.stateVariableReferences);

    this.contractCode = await this.web3.eth.getCode(this.contractAddress);
  }

  private async decodeVariable(variable: Decoder.StorageMemberAllocation, block: number): Promise<Values.Value> {
    const info: Decoder.EvmInfo = {
      state: {
        stack: [],
        storage: {},
        memory: new Uint8Array(0)
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      storageAllocations: this.storageAllocations,
      contexts: this.contexts,
      currentContext: this.context
    };

    const decoder = Decoder.forEvmState(variable.definition, variable.pointer, info);

    let result = decoder.next();
    while(!result.done) {
      let request = <Decoder.DecoderRequest>(result.value);
      let response: Uint8Array;
      if(Decoder.isStorageRequest(request)) {
        response = await this.getStorage(this.contractAddress, request.slot, block);
      }
      else if(Decoder.isCodeRequest(request)) {
        response = await this.getCode(request.address, block);
      }
      //note: one of the above conditionals *must* be true by the type system.
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value

    return <Values.Value>result.value;
  }

  public async state(block: BlockType = "latest"): Promise<DecoderTypes.ContractState | undefined> {
    let blockNumber = typeof block === "number"
      ? block
      : (await this.web3.eth.getBlock(block)).number;

    let result: DecoderTypes.ContractState = {
      name: this.contract.contractName,
      code: this.contractCode,
      balance: new BN(await this.web3.eth.getBalance(this.contractAddress, blockNumber)),
      nonce: new BN(await this.web3.eth.getTransactionCount(this.contractAddress, blockNumber)),
      variables: {}
    };

    debug("state called");

    for(const variable of Object.values(this.stateVariableReferences)) {

      debug("about to decode %s", variable.definition.name);
      const decodedVariable = await this.decodeVariable(variable, blockNumber);
      debug("decoded");

      result.variables[variable.definition.name] = decodedVariable;

      debug("var %O", result.variables[variable.definition.name]);
    }

    return result;
  }

  public async variable(nameOrId: string | number, block: BlockType = "latest"): Promise<Values.Value | undefined> {
    let blockNumber = typeof block === "number"
      ? block
      : (await this.web3.eth.getBlock(block)).number;

    let variable: Decoder.StorageMemberAllocation;
    if(typeof nameOrId === "number")
    {
      variable = this.stateVariableReferences[nameOrId];
    }
    else { //search by name
      variable = Object.values(this.stateVariableReferences)
      .find(({definition}) => definition.name === nameOrId); //there should be exactly one
    }

    if(variable === undefined) { //if user put in a bad name
      return undefined;
    }

    return await this.decodeVariable(variable, blockNumber);
  }

  private async getStorage(address: string, slot: BN, block: number): Promise<Uint8Array> {
    //first, set up any preliminary layers as needed
    if(this.storageCache[block] === undefined) {
      this.storageCache[block] = {};
    }
    if(this.storageCache[block][address] === undefined) {
      this.storageCache[block][address] = {};
    }
    //now, if we have it cached, just return it
    if(this.storageCache[block][address][slot.toString()] !== undefined) {
      return this.storageCache[block][address][slot.toString()];
    }
    //otherwise, get it, cache it, and return it
    let word = DecodeUtils.Conversion.toBytes(
      await this.web3.eth.getStorageAt(
        address,
        slot,
        block
      ),
      DecodeUtils.EVM.WORD_SIZE
    );
    this.storageCache[block][address][slot.toString()] = word;
    return word;
  }

  private async getCode(address: string, block: number): Promise<Uint8Array> {
    //first, set up any preliminary layers as needed
    if(this.codeCache[block] === undefined) {
      this.codeCache[block] = {};
    }
    //now, if we have it cached, just return it
    if(this.codeCache[block][address] !== undefined) {
      return this.codeCache[block][address];
    }
    //otherwise, get it, cache it, and return it
    let code = DecodeUtils.Conversion.toBytes(
      await this.web3.eth.getCode(
        address,
        block
      )
    );
    this.codeCache[block][address] = code;
    return code;
  }

  //EXAMPLE: to watch a.b.c[d][e], use watchMappingKey("a", "b", "c", d, e)
  //(this will watch all ancestors too, or at least ones given by mapping keys)
  //feel free to mix arrays, mappings, and structs here!
  //see the comment on constructSlot for more detail on what forms are accepted
  public watchMappingKey(variable: number | string, ...indices: any[]): void {
    let slot: Decoder.Slot | undefined = this.constructSlot(variable, ...indices)[0];
    //add mapping key and all ancestors
    debug("slot: %O", slot);
    while(slot !== undefined &&
      this.mappingKeys.every(existingSlot =>
      !isEqual(existingSlot,slot)
        //we put the newness requirement in the while condition rather than a
        //separate if because if we hit one ancestor that's not new, the futher
        //ones won't be either
    )) {
      if(slot.key !== undefined) { //only add mapping keys
          this.mappingKeys = [...this.mappingKeys, slot];
      }
      slot = slot.path;
    }
  }

  //input is similar to watchMappingKey; will unwatch all descendants too
  public unwatchMappingKey(variable: number | string, ...indices: any[]): void {
    let slot: Decoder.Slot | undefined = this.constructSlot(variable, ...indices)[0];
    if(slot === undefined) {
      return; //not strictly necessary, but may as well
    }
    //remove mapping key and all descendants
    this.mappingKeys = this.mappingKeys.filter( existingSlot => {
      while(existingSlot !== undefined) {
        if(isEqual(existingSlot, slot)) {
          return false; //if it matches, remove it
        }
        existingSlot = existingSlot.path;
      }
      return true; //if we didn't match, keep the key
    });
  }
  //NOTE: if you decide to add a way to remove a mapping key *without* removing
  //all descendants, you'll need to alter watchMappingKey to use an if rather
  //than a while

  public decodeTransaction(transaction: Transaction): any {
    const decodedData = abiDecoder.decodeMethod(transaction.input);

    return decodedData;
  }

  public decodeLog(log: Log): any {
    const decodedLogs = this.decodeLogs([log]);

    return decodedLogs[0];
  }

  public decodeLogs(logs: Log[]): any[] {
    const decodedLogs = abiDecoder.decodeLogs(logs);

    return decodedLogs;
  }

  private decodeEvent(event: EventLog): DecoderTypes.ContractEvent {
    let contractEvent: DecoderTypes.ContractEvent = {
      logIndex: event.logIndex,
      name: event.event,
      blockHash: event.blockHash,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      transactionIndex: event.transactionIndex,
      variables: {}
    };

    const eventDefinition = this.eventDefinitions[this.eventDefinitionIdsByName[contractEvent.name]];

    if (typeof eventDefinition.parameters !== "undefined" && typeof eventDefinition.parameters.parameters !== "undefined") {
      const argumentDefinitions = eventDefinition.parameters.parameters;

      for (let i = 0; i < argumentDefinitions.length; i++) {
        const definition = argumentDefinitions[i];

        if (definition.nodeType === "VariableDeclaration") {
          contractEvent.variables[definition.name] = {
            name: definition.name,
            type: DefinitionUtils.typeClass(definition),
            value: event.returnValues[definition.name] // TODO: this should be a decoded value, it currently is a string always
          };
        }
      }
    }

    return contractEvent;
  }

  public async events(name: string | null = null, block: BlockType = "latest"): Promise<DecoderTypes.ContractEvent[]> {
    const web3Contract = new this.web3.eth.Contract(this.contract.abi, this.contractAddress);
    const events = await web3Contract.getPastEvents(name, {
      fromBlock: block,
      toBlock: block
    });

    let contractEvents: DecoderTypes.ContractEvent[] = [];

    for (let i = 0; i < events.length; i++) {
      contractEvents.push(this.decodeEvent(events[i]));
    }

    return contractEvents;
  }

  public onEvent(name: string, callback: Function): void {
    //this.web3.eth.subscribe(name);
  }

  public removeEventListener(name: string): void {
  }

  //in addition to returning the slot we want, it also returns a definition
  //used in the recursive call
  //HOW TO USE:
  //variable may be either a variable id (number) or name (string)
  //struct members may be given either by id (number) or name (string)
  //array indices and numeric mapping keys may be BN, number, or numeric string
  //string mapping keys should be given as strings. duh.
  //bytes mapping keys should be given as hex strings beginning with "0x"
  //address mapping keys are like bytes; checksum case is not required
  //boolean mapping keys may be given either as booleans, or as string "true" or "false"
  private constructSlot(variable: number | string, ...indices: any[]): [Decoder.Slot | undefined , AstDefinition | undefined] {
    //base case: we need to locate the variable and its definition
    if(indices.length === 0) {
      let allocation: Decoder.StorageMemberAllocation;
      if(typeof variable === "number") {
        allocation = this.stateVariableReferences[variable];
      }
      else {
        allocation = Object.values(this.stateVariableReferences)
        .find(({definition}) => definition.name === variable);
      }

      let definition = allocation.definition;
      let pointer = allocation.pointer;
      if(!Decoder.isStoragePointer(pointer)) { //if it's a constant
        return [undefined, undefined];
      }
      return [pointer.storage.from.slot, definition];
    }

    //main case
    let parentIndices = indices.slice(0, -1); //remove last index
    let [parentSlot, parentDefinition] = this.constructSlot(variable, ...parentIndices);
    if(parentSlot === undefined) {
      return [undefined, undefined];
    }
    let rawIndex = indices[indices.length - 1];
    let index: any;
    let key: Values.ElementaryValueProper;
    let slot: Decoder.Slot;
    let definition: AstDefinition;
    switch(DefinitionUtils.typeClass(parentDefinition)) {
      case "array":
        if(rawIndex instanceof BN) {
          index = rawIndex.clone();
        }
        else {
          index = new BN(rawIndex);
        }
        definition = parentDefinition.baseType || parentDefinition.typeName.baseType;
        let size = Decoder.storageSize(definition, this.referenceDeclarations, this.storageAllocations);
        if(!Decoder.isWordsLength(size)) {
          return [undefined, undefined];
        }
        slot = {
          path: parentSlot,
          offset: index.muln(size.words),
          hashPath: DefinitionUtils.isDynamicArray(parentDefinition)
        }
        break;
      case "mapping":
        let keyDefinition = parentDefinition.keyType || parentDefinition.typeName.keyType;
        key = Values.wrapElementaryValue(rawIndex, keyDefinition);
        definition = parentDefinition.valueType || parentDefinition.typeName.valueType;
        slot = {
          path: parentSlot,
          key,
          offset: new BN(0)
        }
        break;
      case "struct":
        let parentId = DefinitionUtils.typeId(parentDefinition);
        let allocation: Decoder.StorageMemberAllocation;
        if(typeof rawIndex === "number") {
          index = rawIndex;
          allocation = this.storageAllocations[parentId].members[index];
          definition = allocation.definition;
        }
        else {
          allocation = Object.values(this.storageAllocations[parentId].members)
          .find(({definition}) => definition.name === rawIndex); //there should be exactly one
          definition = allocation.definition;
          index = definition.id; //not really necessary, but may as well
        }
        slot = {
          path: parentSlot,
          //need type coercion here -- we know structs don't contain constants but the compiler doesn't
          offset: (<Decoder.StoragePointer>allocation.pointer).storage.from.slot.offset.clone()
        }
        break;
      default:
        return [undefined, undefined];
    }
    return [slot, definition];
  }

}
