import debugModule from "debug";
const debug = debugModule("decoder:contract");

import * as CodecUtils from "truffle-codec-utils";
import { Types, Values } from "truffle-codec-utils";
import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { Definition as DefinitionUtils, AbiUtils, EVM, AstDefinition, AstReferences } from "truffle-codec-utils";
import { BlockType, Transaction } from "web3/eth/types";
import { EventLog, Log } from "web3/types";
import { Provider } from "web3/providers";
import * as Codec from "truffle-codec";
import * as DecoderTypes from "./types";
import * as Utils from "./utils";

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
  private contexts: CodecUtils.Contexts.DecoderContexts = {};
  private contextsById: CodecUtils.Contexts.DecoderContextsById = {}; //deployed contexts only
  private context: CodecUtils.Contexts.DecoderContext;
  private constructorContext: CodecUtils.Contexts.DecoderContext;
  private contextHash: string;
  private constructorContextHash: string;

  private referenceDeclarations: AstReferences;
  private userDefinedTypes: Types.TypesById;
  private allocations: Codec.AllocationInfo;

  private stateVariableReferences: Codec.StorageMemberAllocation[];

  private mappingKeys: Codec.Slot[] = [];

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
    if(this.contract.deployedBytecode) { //just to be safe
      const context = Utils.makeContext(this.contract, this.contractNode);
      debug("adding context: %O", context);
      const hash = CodecUtils.Conversion.toHexString(
        CodecUtils.EVM.keccak256({type: "string",
          value: context.binary
        })
      );
      debug("with hash: %s", hash);
      this.context = context;
      this.contextHash = hash;
      this.contexts[hash] = context;
    }
    if(this.contract.bytecode) { //now the constructor version
      const constructorContext = Utils.makeContext(this.contract, this.contractNode, true);
      debug("adding context: %O", constructorContext);
      const hash = CodecUtils.Conversion.toHexString(
        CodecUtils.EVM.keccak256({type: "string",
          value: constructorContext.binary
        })
      );
      debug("with hash: %s", hash);
      this.constructorContext = constructorContext;
      this.constructorContextHash = hash;
      this.contexts[hash] = constructorContext;
    }

    for(let relevantContract of this.relevantContracts) {
      let node: AstDefinition = Utils.getContractNode(relevantContract);
      if(node !== undefined) {
        this.contracts[node.id] = relevantContract;
        this.contractNodes[node.id] = node;
        if(relevantContract.deployedBytecode) {
          const context = Utils.makeContext(relevantContract, node);
          debug("adding context: %O", context);
          const hash = CodecUtils.Conversion.toHexString(
            CodecUtils.EVM.keccak256({type: "string",
              value: context.binary
            })
          );
          this.contexts[hash] = context;
        }
      }
    }

    debug("contexts: %o", this.contexts);
    this.contexts = <CodecUtils.Contexts.DecoderContexts>CodecUtils.Contexts.normalizeContexts(this.contexts);
    this.context = this.contexts[this.contextHash];
    this.constructorContext = this.contexts[this.constructorContextHash];
    this.contextsById = Object.assign({}, ...Object.values(this.contexts).filter(
      ({isConstructor}) => !isConstructor
    ).map(context =>
      ({[context.contractId]: context})
    ));
  }

  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();
    if(this.contractAddress === undefined) {
      this.contractAddress = this.contract.networks[this.contractNetwork].address;
    }

    debug("init called");
    [this.referenceDeclarations, this.userDefinedTypes] = this.getUserDefinedTypes();

    let libraryAllocationInfo: Codec.ContractAllocationInfo[] =
    Object.entries(this.contracts).filter(
      ([id, _]) => this.contractNodes[parseInt(id)].contractKind === "library"
    ).
    map(
      ([id, { abi }]) => ({
        abi: <AbiUtils.Abi>abi,
        id: parseInt(id)
      })
    );

    this.allocations = {};
    this.allocations.storage = Codec.getStorageAllocations(
      this.referenceDeclarations,
      {[this.contractNode.id]: this.contractNode}
    );
    this.allocations.abi = Codec.getAbiAllocations(this.referenceDeclarations);
    this.allocations.calldata = Codec.getCalldataAllocations(
      [{
        abi: <AbiUtils.Abi>this.contract.abi,
        id: this.contractNode.id,
        constructorContext: this.constructorContext
      }],
      this.referenceDeclarations,
      this.allocations.abi
    );
    this.allocations.event = Codec.getEventAllocations(
      [
        {
          abi: <AbiUtils.Abi>this.contract.abi,
          id: this.contractNode.id
        },
        ...libraryAllocationInfo
      ],
      this.referenceDeclarations,
      this.allocations.abi
    );

    debug("done with allocation");
    this.stateVariableReferences = this.allocations.storage[this.contractNode.id].members;
    debug("stateVariableReferences %O", this.stateVariableReferences);

    this.contractCode = await this.web3.eth.getCode(this.contractAddress);
  }

  private getUserDefinedTypes(): [AstReferences, Types.TypesById] {
    let references: AstReferences = {};
    let types: Types.TypesById = {};
    for(const id in this.contracts) {
      const compiler = this.contracts[id].compiler;
      //first, add the contract itself
      const contractNode = this.contractNodes[id];
      references[id] = contractNode;
      types[id] = Types.definitionToStoredType(contractNode, compiler);
      //now, add its struct and enum definitions
      for(const node of contractNode.nodes) {
        if(node.nodeType === "StructDefinition" || node.nodeType === "EnumDefinition") {
          references[node.id] = node;
          //HACK even though we don't have all the references, we only need one:
          //the reference to the contract itself, which we just added, so we're good
          types[node.id] = Types.definitionToStoredType(node, compiler, references);
        }
      }
    }
    return [references, types];
  }

  private async decodeVariable(variable: Codec.StorageMemberAllocation, block: number): Promise<Values.Result> {
    const info: Codec.EvmInfo = {
      state: {
        storage: {},
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contextsById,
      currentContext: this.context
    };

    const decoder = Codec.decodeVariable(variable.definition, variable.pointer, info);

    let result = decoder.next();
    while(!result.done) {
      let request = <Codec.DecoderRequest>(result.value);
      let response: Uint8Array;
      if(Codec.isStorageRequest(request)) {
        response = await this.getStorage(this.contractAddress, request.slot, block);
      }
      else if(Codec.isCodeRequest(request)) {
        response = await this.getCode(request.address, block);
      }
      //note: one of the above conditionals *must* be true by the type system.
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value

    return <Values.Result>result.value;
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

    for(const variable of this.stateVariableReferences) {

      debug("about to decode %s", variable.definition.name);
      const decodedVariable = await this.decodeVariable(variable, blockNumber);
      debug("decoded");

      result.variables[variable.definition.name] = decodedVariable;

      debug("var %O", result.variables[variable.definition.name]);
    }

    return result;
  }

  public async variable(nameOrId: string | number, block: BlockType = "latest"): Promise<Values.Result | undefined> {
    let blockNumber = typeof block === "number"
      ? block
      : (await this.web3.eth.getBlock(block)).number;

    let variable: Codec.StorageMemberAllocation;
    variable = this.stateVariableReferences.find(
      ({definition}) => definition.name === nameOrId || definition.id == nameOrId
    ); //there should be exactly one
    //note: deliberate use of == in that second one to allow numeric strings to work

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
    //first, set up any preliminary layers as needed
    if(this.codeCache[block] === undefined) {
      this.codeCache[block] = {};
    }
    //now, if we have it cached, just return it
    if(this.codeCache[block][address] !== undefined) {
      return this.codeCache[block][address];
    }
    //otherwise, get it, cache it, and return it
    let code = CodecUtils.Conversion.toBytes(
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
    let slot: Codec.Slot | undefined = this.constructSlot(variable, ...indices)[0];
    //add mapping key and all ancestors
    debug("slot: %O", slot);
    while(slot !== undefined &&
      this.mappingKeys.every(existingSlot =>
      !Codec.equalSlots(existingSlot,slot)
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
    let slot: Codec.Slot | undefined = this.constructSlot(variable, ...indices)[0];
    if(slot === undefined) {
      return; //not strictly necessary, but may as well
    }
    //remove mapping key and all descendants
    this.mappingKeys = this.mappingKeys.filter( existingSlot => {
      while(existingSlot !== undefined) {
        if(Codec.equalSlots(existingSlot, slot)) {
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

  //NOTE: will only work with transactions to-or-creating this address!
  public async decodeTransaction(transaction: Transaction): Promise<DecoderTypes.DecodedTransaction> {
    if(transaction.to !== this.contractAddress) {
      if(transaction.to !== null) {
        throw new DecoderTypes.EventOrTransactionIsNotForThisContractError(transaction.to, this.contractAddress);
      }
      else {
        //OK, it's not *to* this address, but maybe it *created* it?
        const receipt = await this.web3.eth.getTransactionReceipt(transaction.hash);
        if(receipt.contractAddress !== this.contractAddress) {
          throw new DecoderTypes.EventOrTransactionIsNotForThisContractError(receipt.contractAddress, this.contractAddress);
        }
      }
    }
    const block = transaction.blockNumber;
    const data = CodecUtils.Conversion.toBytes(transaction.input);
    const info: Codec.EvmInfo = {
      state: {
        storage: {},
        calldata: data,
      },
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contextsById,
      currentContext: transaction.to === null ? this.constructorContext : this.context
    };
    const decoder = Codec.decodeCalldata(info);

    let result = decoder.next();
    while(!result.done) {
      let request = <Codec.DecoderRequest>(result.value);
      let response: Uint8Array;
      //only code requests should occur here
      if(Codec.isCodeRequest(request)) {
        response = await this.getCode(request.address, block);
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value
    const decoding = <Codec.CalldataDecoding>result.value;
    
    return {
      ...transaction,
      decoding
    };
  }

  //NOTE: will only work with logs for this address!
  public async decodeLog(log: Log, name: string | null = null): Promise<DecoderTypes.DecodedEvent> {
    if(log.address !== this.contractAddress) {
      throw new DecoderTypes.EventOrTransactionIsNotForThisContractError(log.address, this.contractAddress);
    }
    const block = log.blockNumber;
    const data = CodecUtils.Conversion.toBytes(log.data);
    const topics = log.topics.map(CodecUtils.Conversion.toBytes);
    const info: Codec.EvmInfo = {
      state: {
        storage: {},
        eventdata: data,
        eventtopics: topics
      },
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contextsById
    };
    const decoder = Codec.decodeEvent(info, log.address, name);

    let result = decoder.next();
    while(!result.done) {
      let request = <Codec.DecoderRequest>(result.value);
      let response: Uint8Array;
      //only code requests should occur here
      if(Codec.isCodeRequest(request)) {
        response = await this.getCode(request.address, block);
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value
    const decodings = <Codec.EventDecoding[]>result.value;
    
    return {
      ...log,
      decodings
    };
  }

  //NOTE: will only work with logs for this address!
  public async decodeLogs(logs: Log[], name: string | null = null): Promise<DecoderTypes.DecodedEvent[]> {
    return await Promise.all(logs.map(log => this.decodeLog(log, name)));
  }

  public async events(name: string | null = null, fromBlock: BlockType = "latest", toBlock: BlockType = "latest"): Promise<DecoderTypes.DecodedEvent[]> {
    const logs = await this.web3.eth.getPastLogs({
      address: this.contractAddress,
      fromBlock,
      toBlock,
    });

    let events = await this.decodeLogs(logs, name);

    //if a target name was specified, we'll restrict to events that decoded
    //to something with that name.  (note that only decodings with that name
    //will have been returned from decodeLogs in the first place)
    if(name !== null) {
      events = events.filter(
        event => event.decodings.length > 0
      );
    }

    return events;
  }

  public onEvent(name: string, callback: Function): void {
    //this.web3.eth.subscribe(name);
  }

  public removeEventListener(name: string): void {
  }

  //in addition to returning the slot we want, it also returns a definition
  //used in the recursive call
  //HOW TO USE:
  //variable may be either a variable id (number or numeric string) or name (string)
  //struct members may be given either by id (number) or name (string)
  //array indices and numeric mapping keys may be BN, number, or numeric string
  //string mapping keys should be given as strings. duh.
  //bytes mapping keys should be given as hex strings beginning with "0x"
  //address mapping keys are like bytes; checksum case is not required
  //boolean mapping keys may be given either as booleans, or as string "true" or "false"
  private constructSlot(variable: number | string, ...indices: any[]): [Codec.Slot | undefined , AstDefinition | undefined] {
    //base case: we need to locate the variable and its definition
    if(indices.length === 0) {
      let allocation: Codec.StorageMemberAllocation;
      allocation = this.stateVariableReferences.find(
        ({definition}) => definition.name === variable || definition.id == variable
      ); //there should be exactly one
      //note: deliberate use of == in that second one to allow numeric strings to work

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
    let slot: Codec.Slot;
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
        let size = Codec.storageSize(definition, this.referenceDeclarations, this.allocations.storage);
        if(!Codec.isWordsLength(size)) {
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
        let allocation: Codec.StorageMemberAllocation;
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
          offset: (<Codec.StoragePointer>allocation.pointer).range.from.slot.offset.clone()
        }
        break;
      default:
        return [undefined, undefined];
    }
    return [slot, definition];
  }

}
