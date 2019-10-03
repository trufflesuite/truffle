import debugModule from "debug";
const debug = debugModule("codec:interface:decoders:contract");

import * as CodecUtils from "@truffle/codec/utils";
import { wrapElementaryViaDefinition, Definition as DefinitionUtils, AbiUtils, EVM, ContextUtils } from "@truffle/codec/utils";
import * as Utils from "@truffle/codec/utils/interface";
import { Ast, Pointer, Allocation, Contexts } from "@truffle/codec/types";
import { Types, Values } from "@truffle/codec/format";
import Web3 from "web3";
import { ContractObject } from "@truffle/contract-schema/spec";
import BN from "bn.js";
import WireDecoder from "./wire";
import { BlockType, Transaction } from "web3/eth/types";
import { Log } from "web3/types";
import * as DecoderTypes from "@truffle/codec/types/interface";
import { EvmInfo, AllocationInfo } from "@truffle/codec/types/evm";
import { getStorageAllocations, storageSize } from "@truffle/codec/allocate/storage";
import { CalldataDecoding, LogDecoding } from "@truffle/codec/types/decoding";
import { decodeVariable } from "@truffle/codec/core/decoding";
import { Slot } from "@truffle/codec/types/storage";
import { isWordsLength, equalSlots } from "@truffle/codec/utils/storage";
import { ContractBeingDecodedHasNoNodeError, ContractAllocationFailedError } from "@truffle/codec/interface/errors";

export default class ContractDecoder {

  private web3: Web3;

  private contexts: Contexts.DecoderContexts; //note: this is deployed contexts only!

  private contract: ContractObject;
  private contractNode: Ast.Definition;
  private contractNetwork: string;
  private contextHash: string;

  private allocations: AllocationInfo;
  private stateVariableReferences: Allocation.StorageMemberAllocation[];

  private wireDecoder: WireDecoder;

  /**
   * @private
   */
  constructor(contract: ContractObject, wireDecoder: WireDecoder, address?: string) {

    this.contract = contract;
    this.wireDecoder = wireDecoder;
    this.web3 = wireDecoder.getWeb3();

    this.contexts = wireDecoder.getDeployedContexts();

    this.contractNode = Utils.getContractNode(this.contract);

    if(this.contract.deployedBytecode && this.contract.deployedBytecode !== "0x") {
      const unnormalizedContext = Utils.makeContext(this.contract, this.contractNode);
      this.contextHash = unnormalizedContext.context;
      //we now throw away the unnormalized context, instead fetching the correct one from
      //this.contexts (which is normalized) via the context getter below
    }

    this.allocations = this.wireDecoder.getAllocations();
    if(this.contractNode) {
      this.allocations.storage = getStorageAllocations(
        this.wireDecoder.getReferenceDeclarations(), //redundant stuff will be skipped so this is fine
        {[this.contractNode.id]: this.contractNode},
        this.allocations.storage //existing allocations from wire decoder
      );

      debug("done with allocation");
      if(this.allocations.storage[this.contractNode.id]) {
        this.stateVariableReferences = this.allocations.storage[this.contractNode.id].members;
      }
      //if it doesn't exist, we will leave it undefined, and then throw an exception when
      //we attempt to decode
      debug("stateVariableReferences %O", this.stateVariableReferences);
    }
  }

  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();
  }

  public async forInstance(address?: string): Promise<ContractInstanceDecoder> {
    let instanceDecoder = new ContractInstanceDecoder(this, address);
    await instanceDecoder.init();
    return instanceDecoder;
  }

  public async decodeTransaction(transaction: Transaction): Promise<DecoderTypes.DecodedTransaction> {
    return await this.wireDecoder.decodeTransaction(transaction);
  }

  public async decodeLog(log: Log): Promise<DecoderTypes.DecodedLog> {
    return await this.wireDecoder.decodeLog(log);
  }

  public async decodeLogs(logs: Log[]): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.decodeLogs(logs);
  }

  public async events(options: DecoderTypes.EventOptions = {}): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.events(options);
  }

  public abifyCalldataDecoding(decoding: CalldataDecoding): CalldataDecoding {
    return this.wireDecoder.abifyCalldataDecoding(decoding);
  }

  public abifyLogDecoding(decoding: LogDecoding): LogDecoding {
    return this.wireDecoder.abifyLogDecoding(decoding);
  }

  //the following functions are for internal use
  public getAllocations() {
    return this.allocations;
  }

  public getStateVariableReferences() {
    return this.stateVariableReferences;
  }

  public getWireDecoder() {
    return this.wireDecoder;
  }

  public getContractInfo(): ContractInfo {
    return {
      contract: this.contract,
      contractNode: this.contractNode,
      contractNetwork: this.contractNetwork,
      contextHash: this.contextHash,
    }
  }
}

interface ContractInfo {
  contract: ContractObject;
  contractNode: Ast.Definition;
  contractNetwork: string;
  contextHash: string;
}

export class ContractInstanceDecoder {
  private web3: Web3;

  private contract: ContractObject;
  private contractNode: Ast.Definition;
  private contractNetwork: string;
  private contractAddress: string;
  private contractCode: string;
  private contextHash: string;

  private contexts: Contexts.DecoderContexts = {}; //deployed contexts only
  private additionalContexts: Contexts.DecoderContexts = {}; //for passing to wire decoder when contract has no deployedBytecode

  private referenceDeclarations: Ast.References;
  private userDefinedTypes: Types.TypesById;
  private allocations: AllocationInfo;

  private stateVariableReferences: Allocation.StorageMemberAllocation[];

  private mappingKeys: Slot[] = [];

  private storageCache: DecoderTypes.StorageCache = {};

  private contractDecoder: ContractDecoder;
  private wireDecoder: WireDecoder;

  /**
   * @private
   */
  constructor(contractDecoder: ContractDecoder, address?: string) {

    this.contractDecoder = contractDecoder;
    if(address !== undefined) {
      this.contractAddress = address;
    }
    this.wireDecoder = this.contractDecoder.getWireDecoder();
    this.web3 = this.wireDecoder.getWeb3();

    this.referenceDeclarations = this.wireDecoder.getReferenceDeclarations();
    this.userDefinedTypes = this.wireDecoder.getUserDefinedTypes();
    this.contexts = this.wireDecoder.getDeployedContexts();
    ({
      contract: this.contract,
      contractNode: this.contractNode,
      contractNetwork: this.contractNetwork,
      contextHash: this.contextHash,
    } = this.contractDecoder.getContractInfo());

    this.allocations = this.contractDecoder.getAllocations();
    this.stateVariableReferences = this.contractDecoder.getStateVariableReferences();

    if(this.contractAddress === undefined) {
      this.contractAddress = this.contract.networks[this.contractNetwork].address;
    }
  }

  public async init(): Promise<void> {
    this.contractCode = CodecUtils.Conversion.toHexString(
      await this.getCode(this.contractAddress, await this.web3.eth.getBlockNumber())
    );

    if(!this.contract.deployedBytecode || this.contract.deployedBytecode === "0x") {
      //if this contract does *not* have the deployedBytecode field, then the decoder core
      //has no way of knowing that contracts or function pointers with its address
      //are of its class; this is an especial problem for function pointers, as it
      //won't be able to determine what the selector points to.
      //so, to get around this, we make an "additional context" for the contract,
      //based on its *actual* deployed bytecode as pulled from the blockchain.
      //This way the decoder core can recognize the address as the class, without us having
      //to make serious modifications to contract decoding.  And while sure this requires
      //a little more work, I mean, it's all cached, so, no big deal.
      let extraContext = Utils.makeContext(this.contract, this.contractNode);
      //now override the binary
      extraContext.binary = this.contractCode;
      this.additionalContexts = {[extraContext.context]: extraContext};
      //the following line only has any effect if we're dealing with a library,
      //since the code we pulled from the blockchain obviously does not have unresolved link references!
      //(it's not strictly necessary even then, but, hey, why not?)
      this.additionalContexts = <Contexts.DecoderContexts>ContextUtils.normalizeContexts(this.additionalContexts);
      //again, since the code did not have unresolved link references, it is safe to just
      //mash these together like I'm about to
      this.contexts = {...this.contexts, ...this.additionalContexts};
    }
  }

  private get context(): Contexts.DecoderContext {
    return this.contexts[this.contextHash];
  }

  private checkAllocationSuccess(): void {
    if(!this.contractNode) {
      throw new ContractBeingDecodedHasNoNodeError(this.contract.contractName);
    }
    if(!this.stateVariableReferences) {
      throw new ContractAllocationFailedError(this.contractNode.id, this.contract.contractName);
    }
  }

  private async decodeVariable(variable: Allocation.StorageMemberAllocation, block: number): Promise<DecoderTypes.DecodedVariable> {
    const info: EvmInfo = {
      state: {
        storage: {},
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contexts,
      currentContext: this.context
    };

    const decoder = decodeVariable(variable.definition, variable.pointer, info);

    let result = decoder.next();
    while(result.done === false) {
      let request = result.value;
      let response: Uint8Array;
      switch(request.type) {
        case "storage":
          response = await this.getStorage(this.contractAddress, request.slot, block);
          break;
        case "code":
          response = await this.getCode(request.address, block);
          break;
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value

    return {
      name: variable.definition.name,
      class: <Types.ContractType> this.userDefinedTypes[variable.definedIn.id],
      value: result.value,
    };
  }

  public async state(block: BlockType = "latest"): Promise<DecoderTypes.ContractState> {
    return {
      name: this.contract.contractName,
      code: this.contractCode,
      balanceAsBN: new BN(await this.web3.eth.getBalance(this.contractAddress, block)),
      nonceAsBN: new BN(await this.web3.eth.getTransactionCount(this.contractAddress, block)),
    };
  }

  public async variables(block: BlockType = "latest"): Promise<DecoderTypes.DecodedVariable[]> {
    this.checkAllocationSuccess();

    let blockNumber = typeof block === "number"
      ? block
      : (await this.web3.eth.getBlock(block)).number;

    let result: DecoderTypes.DecodedVariable[] = [];

    for(const variable of this.stateVariableReferences) {

      debug("about to decode %s", variable.definition.name);
      const decodedVariable = await this.decodeVariable(variable, blockNumber);
      debug("decoded");

      result.push(decodedVariable);
    }

    return result;
  }

  //variable may be given by name, ID, or qualified name
  public async variable(nameOrId: string | number, block: BlockType = "latest"): Promise<Values.Result | undefined> {
    this.checkAllocationSuccess();

    let blockNumber = typeof block === "number"
      ? block
      : (await this.web3.eth.getBlock(block)).number;

    let variable = this.findVariableByNameOrId(nameOrId);

    if(variable === undefined) { //if user put in a bad name
      return undefined;
    }

    return (await this.decodeVariable(variable, blockNumber)).value;
  }

  private findVariableByNameOrId(nameOrId: string | number): Allocation.StorageMemberAllocation | undefined {
    //case 1: an ID was input
    if(typeof nameOrId === "number" || nameOrId.match(/[0-9]+/)) {
      let id: number = Number(nameOrId);
      return this.stateVariableReferences.find(
        ({definition}) => definition.id === nameOrId
      );
      //there should be exactly one; returns undefined if none
    }
    //case 2: a name was input
    else if(!nameOrId.includes(".")) {
      //we want to search *backwards*, to get most derived version;
      //we use slice().reverse() to clone before reversing since reverse modifies
      return this.stateVariableReferences.slice().reverse().find(
        ({definition}) => definition.name === nameOrId
      );
    }
    //case 3: a qualified name was input
    else {
      let [className, variableName] = nameOrId.split(".");
      //again, we'll search backwards, although, uhhh...?
      return this.stateVariableReferences.slice().reverse().find(
        ({definition, definedIn}) =>
          definition.name === variableName && definedIn.name === className
      );
    }
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
    let word = CodecUtils.Conversion.toBytes(
      await this.web3.eth.getStorageAt(
        address,
        slot,
        block
      ),
      CodecUtils.EVM.WORD_SIZE
    );
    this.storageCache[block][address][slot.toString()] = word;
    return word;
  }

  private async getCode(address: string, block: number): Promise<Uint8Array> {
    return await this.wireDecoder.getCode(address, block);
  }

  //EXAMPLE: to watch a.b.c[d][e], use watchMappingKey("a", "b", "c", d, e)
  //(this will watch all ancestors too, or at least ones given by mapping keys)
  //feel free to mix arrays, mappings, and structs here!
  //see the comment on constructSlot for more detail on what forms are accepted
  public watchMappingKey(variable: number | string, ...indices: any[]): void {
    this.checkAllocationSuccess();
    let slot: Slot | undefined = this.constructSlot(variable, ...indices)[0];
    //add mapping key and all ancestors
    debug("slot: %O", slot);
    while(slot !== undefined &&
      this.mappingKeys.every(existingSlot =>
      !equalSlots(existingSlot,slot)
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
    this.checkAllocationSuccess();
    let slot: Slot | undefined = this.constructSlot(variable, ...indices)[0];
    if(slot === undefined) {
      return; //not strictly necessary, but may as well
    }
    //remove mapping key and all descendants
    this.mappingKeys = this.mappingKeys.filter( existingSlot => {
      while(existingSlot !== undefined) {
        if(equalSlots(existingSlot, slot)) {
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

  public async decodeTransaction(transaction: Transaction): Promise<DecoderTypes.DecodedTransaction> {
    return await this.wireDecoder.decodeTransaction(transaction, this.additionalContexts);
  }

  public async decodeLog(log: Log): Promise<DecoderTypes.DecodedLog> {
    return await this.wireDecoder.decodeLog(log, {}, this.additionalContexts);
  }

  public async decodeLogs(logs: Log[]): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.decodeLogs(logs, {}, this.additionalContexts);
  }

  public abifyCalldataDecoding(decoding: CalldataDecoding): CalldataDecoding {
    return this.wireDecoder.abifyCalldataDecoding(decoding);
  }

  public abifyLogDecoding(decoding: LogDecoding): LogDecoding {
    return this.wireDecoder.abifyLogDecoding(decoding);
  }

  //note: by default restricts address to address of this
  //contract, but you can override this (including by specifying
  //address undefined to not filter by adddress)
  public async events(options: DecoderTypes.EventOptions = {}): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.events({address: this.contractAddress, ...options}, this.additionalContexts);
  }

  //in addition to returning the slot we want, it also returns a definition
  //used in the recursive call
  //HOW TO USE:
  //variable may be a variable id (number or numeric string) or name (string) or qualified name (also string)
  //struct members may be given either by id (number) or name (string)
  //array indices and numeric mapping keys may be BN, number, or numeric string
  //string mapping keys should be given as strings. duh.
  //bytes mapping keys should be given as hex strings beginning with "0x"
  //address mapping keys are like bytes; checksum case is not required
  //boolean mapping keys may be given either as booleans, or as string "true" or "false"
  private constructSlot(variable: number | string, ...indices: any[]): [Slot | undefined , Ast.Definition | undefined] {
    //base case: we need to locate the variable and its definition
    if(indices.length === 0) {
      let allocation = this.findVariableByNameOrId(variable);

      let definition = allocation.definition;
      let pointer = allocation.pointer;
      if(pointer.location !== "storage") { //i.e., if it's a constant
        return [undefined, undefined];
      }
      return [pointer.range.from.slot, definition];
    }

    //main case
    let parentIndices = indices.slice(0, -1); //remove last index
    let [parentSlot, parentDefinition] = this.constructSlot(variable, ...parentIndices);
    if(parentSlot === undefined) {
      return [undefined, undefined];
    }
    let rawIndex = indices[indices.length - 1];
    let index: any;
    let key: Values.ElementaryValue;
    let slot: Slot;
    let definition: Ast.Definition;
    switch(DefinitionUtils.typeClass(parentDefinition)) {
      case "array":
        if(rawIndex instanceof BN) {
          index = rawIndex.clone();
        }
        else {
          index = new BN(rawIndex);
        }
        definition = parentDefinition.baseType || parentDefinition.typeName.baseType;
        let size = storageSize(definition, this.referenceDeclarations, this.allocations.storage);
        if(!isWordsLength(size)) {
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
        key = wrapElementaryViaDefinition(rawIndex, keyDefinition, this.contract.compiler);
        definition = parentDefinition.valueType || parentDefinition.typeName.valueType;
        slot = {
          path: parentSlot,
          key,
          offset: new BN(0)
        }
        break;
      case "struct":
        let parentId = DefinitionUtils.typeId(parentDefinition);
        let allocation: Allocation.StorageMemberAllocation;
        if(typeof rawIndex === "number") {
          index = rawIndex;
          allocation = this.allocations.storage[parentId].members[index];
          definition = allocation.definition;
        }
        else {
          allocation = Object.values(this.allocations.storage[parentId].members)
          .find(({definition}) => definition.name === rawIndex); //there should be exactly one
          definition = allocation.definition;
          index = definition.id; //not really necessary, but may as well
        }
        slot = {
          path: parentSlot,
          //need type coercion here -- we know structs don't contain constants but the compiler doesn't
          offset: (<Pointer.StoragePointer>allocation.pointer).range.from.slot.offset.clone()
        }
        break;
      default:
        return [undefined, undefined];
    }
    return [slot, definition];
  }

}
