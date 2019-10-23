import debugModule from "debug";
const debug = debugModule("codec:interface:decoders:contract");

import * as CodecUtils from "@truffle/codec/utils";
import {
  wrapElementaryViaDefinition,
  Definition as DefinitionUtils,
  AbiUtils,
  EVM,
  ContextUtils
} from "@truffle/codec/utils";
import { DecoderContext, DecoderContexts } from "@truffle/codec/types/contexts";
import * as Utils from "@truffle/codec/utils/interface";
import { AstDefinition, AstReferences } from "@truffle/codec/types/ast";
import { Types, Values } from "@truffle/codec/format";
import Web3 from "web3";
import { ContractObject } from "@truffle/contract-schema/spec";
import BN from "bn.js";
import WireDecoder from "./wire";
import { BlockType, Transaction } from "web3/eth/types";
import { Log } from "web3/types";
import { Provider } from "web3/providers";
import * as DecoderTypes from "@truffle/codec/types/interface";
import { EvmInfo, AllocationInfo } from "@truffle/codec/types/evm";
import { StorageMemberAllocation } from "@truffle/codec/types/allocation";
import {
  getStorageAllocations,
  storageSize
} from "@truffle/codec/allocate/storage";
import { CalldataDecoding, LogDecoding } from "@truffle/codec/types/decoding";
import { decodeVariable } from "@truffle/codec/core/decoding";
import { Slot } from "@truffle/codec/types/storage";
import { isWordsLength, equalSlots } from "@truffle/codec/utils/storage";
import { StoragePointer } from "@truffle/codec/types/pointer";
import {
  ContractBeingDecodedHasNoNodeError,
  ContractAllocationFailedError
} from "@truffle/codec/interface/errors";

/**
 * The ContractDecoder class.  Spawns the [[ContractInstanceDecoder]] class.
 * Also, decodes transactions and logs.  See below for a method listing.
 */
export default class ContractDecoder {
  private web3: Web3;

  private contexts: DecoderContexts; //note: this is deployed contexts only!

  private contract: ContractObject;
  private contractNode: AstDefinition;
  private contractNetwork: string;
  private contextHash: string;

  private allocations: AllocationInfo;
  private stateVariableReferences: StorageMemberAllocation[];

  private wireDecoder: WireDecoder;

  /**
   * @private
   */
  constructor(
    contract: ContractObject,
    wireDecoder: WireDecoder,
    address?: string
  ) {
    this.contract = contract;
    this.wireDecoder = wireDecoder;
    this.web3 = wireDecoder.getWeb3();

    this.contexts = wireDecoder.getDeployedContexts();

    this.contractNode = Utils.getContractNode(this.contract);

    if (
      this.contract.deployedBytecode &&
      this.contract.deployedBytecode !== "0x"
    ) {
      const unnormalizedContext = Utils.makeContext(
        this.contract,
        this.contractNode
      );
      this.contextHash = unnormalizedContext.context;
      //we now throw away the unnormalized context, instead fetching the correct one from
      //this.contexts (which is normalized) via the context getter below
    }

    this.allocations = this.wireDecoder.getAllocations();
    if (this.contractNode) {
      this.allocations.storage = getStorageAllocations(
        this.wireDecoder.getReferenceDeclarations(), //redundant stuff will be skipped so this is fine
        { [this.contractNode.id]: this.contractNode },
        this.allocations.storage //existing allocations from wire decoder
      );

      debug("done with allocation");
      if (this.allocations.storage[this.contractNode.id]) {
        this.stateVariableReferences = this.allocations.storage[
          this.contractNode.id
        ].members;
      }
      //if it doesn't exist, we will leave it undefined, and then throw an exception when
      //we attempt to decode
      debug("stateVariableReferences %O", this.stateVariableReferences);
    }
  }

  /**
   * @hidden
   */
  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();
  }

  /**
   * Constructs a contract instance decoder for a given instance of this contract.
   * @param address The address of the contract instance decode.  If left out, it will be autodetected.
   */
  public async forInstance(address?: string): Promise<ContractInstanceDecoder> {
    let instanceDecoder = new ContractInstanceDecoder(this, address);
    await instanceDecoder.init();
    return instanceDecoder;
  }

  /**
   * See [[WireDecoder.decodeTransaction]].
   * @param transaction The transaction to be decoded.
   */
  public async decodeTransaction(
    transaction: Transaction
  ): Promise<DecoderTypes.DecodedTransaction> {
    return await this.wireDecoder.decodeTransaction(transaction);
  }

  /**
   * See [[WireDecoder.decodeLog]].
   * @param log The log to be decoded.
   */
  public async decodeLog(log: Log): Promise<DecoderTypes.DecodedLog> {
    return await this.wireDecoder.decodeLog(log);
  }

  /**
   * See [[WireDecoder.decodeLogs]].
   * @param logs The logs to be decoded.
   */
  public async decodeLogs(logs: Log[]): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.decodeLogs(logs);
  }

  /**
   * See [[WireDecoder.events]].
   * @param options Used to determine what events to fetch; see the documentation on the EventOptions type for more.
   */
  public async events(
    options: DecoderTypes.EventOptions = {}
  ): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.events(options);
  }

  /**
   * See [[WireDecoder.abifyCalldataDecoding]].
   */
  public abifyCalldataDecoding(decoding: CalldataDecoding): CalldataDecoding {
    return this.wireDecoder.abifyCalldataDecoding(decoding);
  }

  /**
   * See [[WireDecoder.abifyLogDecoding]].
   */
  public abifyLogDecoding(decoding: LogDecoding): LogDecoding {
    return this.wireDecoder.abifyLogDecoding(decoding);
  }

  //the following functions are for internal use

  /**
   * @hidden
   */
  public getAllocations() {
    return this.allocations;
  }

  /**
   * @hidden
   */
  public getStateVariableReferences() {
    return this.stateVariableReferences;
  }

  /**
   * @hidden
   */
  public getWireDecoder() {
    return this.wireDecoder;
  }

  /**
   * @hidden
   */
  public getContractInfo(): ContractInfo {
    return {
      contract: this.contract,
      contractNode: this.contractNode,
      contractNetwork: this.contractNetwork,
      contextHash: this.contextHash
    };
  }
}

interface ContractInfo {
  contract: ContractObject;
  contractNode: AstDefinition;
  contractNetwork: string;
  contextHash: string;
}

/**
 * The ContractInstanceDecoder class.  Decodes storage for a specified
 * instance.  Also, decodes transactions and logs.  See below for a method
 * listing.
 *
 * Note that when using this class to decode transactions and logs, it does
 * have one advantage over using the WireDecoder or ContractDecoder.  If the
 * artifact for the class does not have a deployedBytecode field, the
 * WireDecoder (and therefore also the ContractDecoder) will not be able to
 * tell that this instance is of that class, and so will fail to decode
 * transactions sent to it or logs originating from it.  However, the
 * ContractInstanceDecoder has that information and will make use of it, making
 * it possible for it to decode transactions sent to this instance, or logs
 * originating from it, even if the deployedBytecode field is misssing.
 */
export class ContractInstanceDecoder {
  private web3: Web3;

  private contract: ContractObject;
  private contractNode: AstDefinition;
  private contractNetwork: string;
  private contractAddress: string;
  private contractCode: string;
  private contextHash: string;

  private contexts: DecoderContexts = {}; //deployed contexts only
  private additionalContexts: DecoderContexts = {}; //for passing to wire decoder when contract has no deployedBytecode

  private referenceDeclarations: AstReferences;
  private userDefinedTypes: Types.TypesById;
  private allocations: AllocationInfo;

  private stateVariableReferences: StorageMemberAllocation[];

  private mappingKeys: Slot[] = [];

  private storageCache: DecoderTypes.StorageCache = {};

  private contractDecoder: ContractDecoder;
  private wireDecoder: WireDecoder;

  /**
   * @private
   */
  constructor(contractDecoder: ContractDecoder, address?: string) {
    this.contractDecoder = contractDecoder;
    if (address !== undefined) {
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
      contextHash: this.contextHash
    } = this.contractDecoder.getContractInfo());

    this.allocations = this.contractDecoder.getAllocations();
    this.stateVariableReferences = this.contractDecoder.getStateVariableReferences();

    if (this.contractAddress === undefined) {
      this.contractAddress = this.contract.networks[
        this.contractNetwork
      ].address;
    }
  }

  /**
   * @hidden
   */
  public async init(): Promise<void> {
    this.contractCode = CodecUtils.Conversion.toHexString(
      await this.getCode(
        this.contractAddress,
        await this.web3.eth.getBlockNumber()
      )
    );

    if (
      !this.contract.deployedBytecode ||
      this.contract.deployedBytecode === "0x"
    ) {
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
      this.additionalContexts = { [extraContext.context]: extraContext };
      //the following line only has any effect if we're dealing with a library,
      //since the code we pulled from the blockchain obviously does not have unresolved link references!
      //(it's not strictly necessary even then, but, hey, why not?)
      this.additionalContexts = <DecoderContexts>(
        ContextUtils.normalizeContexts(this.additionalContexts)
      );
      //again, since the code did not have unresolved link references, it is safe to just
      //mash these together like I'm about to
      this.contexts = { ...this.contexts, ...this.additionalContexts };
    }
  }

  private get context(): DecoderContext {
    return this.contexts[this.contextHash];
  }

  private checkAllocationSuccess(): void {
    if (!this.contractNode) {
      throw new ContractBeingDecodedHasNoNodeError(this.contract.contractName);
    }
    if (!this.stateVariableReferences) {
      throw new ContractAllocationFailedError(
        this.contractNode.id,
        this.contract.contractName
      );
    }
  }

  private async decodeVariable(
    variable: StorageMemberAllocation,
    block: number
  ): Promise<DecoderTypes.DecodedVariable> {
    const info: EvmInfo = {
      state: {
        storage: {}
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contexts,
      currentContext: this.context
    };

    const decoder = decodeVariable(variable.definition, variable.pointer, info);

    let result = decoder.next();
    while (result.done === false) {
      let request = result.value;
      let response: Uint8Array;
      switch (request.type) {
        case "storage":
          response = await this.getStorage(
            this.contractAddress,
            request.slot,
            block
          );
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
      class: <Types.ContractType>this.userDefinedTypes[variable.definedIn.id],
      value: result.value
    };
  }

  /**
   * Returns information about the state of the contract, but does not include
   * information about the storage or decoded variables.  See the documentation
   * for the [[ContractState]] type for more.
   * @param block The block to inspect the contract's state at.  Defaults to latest.
   *   See [the web3 docs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#id14)
   *   for legal values.
   */
  public async state(
    block: BlockType = "latest"
  ): Promise<DecoderTypes.ContractState> {
    return {
      name: this.contract.contractName,
      code: this.contractCode,
      balanceAsBN: new BN(
        await this.web3.eth.getBalance(this.contractAddress, block)
      ),
      nonceAsBN: new BN(
        await this.web3.eth.getTransactionCount(this.contractAddress, block)
      )
    };
  }

  /**
   * Decodes the contract's variables; returns an array of these decoded variables.
   * See the documentation of the [[DecodedVariable]] type for more.
   *
   * Note that variable decoding can only operate in full mode; if the decoder wasn't able to
   * start up in full mode, this method will throw an exception.
   *
   * Note that decoding mappings requires first watching mapping keys in order to get any results;
   * see the documentation for [[watchMappingKey]].
   * Additional methods to make mapping decoding a less manual affair are planned for the future.
   *
   * Also, due to a technical limitation, it is not currently possible to
   * usefully decode internal function pointers.  See the
   * [[Format.Values.FunctionInternalValue|FunctionInternalValue]]
   * documentation and the README for more on how these are handled.
   * @param block The block to inspect the contract's variables at.  Defaults to latest.
   *   See [the web3 docs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#id14)
   *   for legal values.
   */
  public async variables(
    block: BlockType = "latest"
  ): Promise<DecoderTypes.DecodedVariable[]> {
    this.checkAllocationSuccess();

    let blockNumber =
      typeof block === "number"
        ? block
        : (await this.web3.eth.getBlock(block)).number;

    let result: DecoderTypes.DecodedVariable[] = [];

    for (const variable of this.stateVariableReferences) {
      debug("about to decode %s", variable.definition.name);
      const decodedVariable = await this.decodeVariable(variable, blockNumber);
      debug("decoded");

      result.push(decodedVariable);
    }

    return result;
  }

  /**
   * Decodes an individual contract variable; returns its value as a
   * [[Format.Values.Result|Result]].  See the documentation for
   * [[variables|variables()]] for various caveats that also apply here.
   *
   * If the variable can't be located, returns undefined.  In the future this
   * will probably throw an exception instead.
   * @param nameOrId The name (or numeric ID, if you know that) of the
   *   variable.  Can be given as a qualified name, allowing one to get at
   *   shadowed variables from base contracts.  If given by ID, can be given as a
   *   number or numeric string.
   * @param block The block to inspect the contract's variables at.  Defaults
   *   to latest.
   *   See [the web3 docs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#id14)
   *   for legal values.
   * @example Consider a contract `Derived` inheriting from a contract `Base`.
   *   Suppose `Derived` has a variable `x` and `Base` has variables `x` and
   *   `y`.  One can access `Derived.x` as `variable("x")` or
   *   `variable("Derived.x")`, can access `Base.x` as `variable("Base.x")`,
   *   and can access `Base.y` as `variable("y")` or `variable("Base.y")`.
   */
  public async variable(
    nameOrId: string | number,
    block: BlockType = "latest"
  ): Promise<Values.Result | undefined> {
    this.checkAllocationSuccess();

    let blockNumber =
      typeof block === "number"
        ? block
        : (await this.web3.eth.getBlock(block)).number;

    let variable = this.findVariableByNameOrId(nameOrId);

    if (variable === undefined) {
      //if user put in a bad name
      return undefined;
    }

    return (await this.decodeVariable(variable, blockNumber)).value;
  }

  private findVariableByNameOrId(
    nameOrId: string | number
  ): StorageMemberAllocation | undefined {
    //case 1: an ID was input
    if (typeof nameOrId === "number" || nameOrId.match(/[0-9]+/)) {
      let id: number = Number(nameOrId);
      return this.stateVariableReferences.find(
        ({ definition }) => definition.id === nameOrId
      );
      //there should be exactly one; returns undefined if none
    }
    //case 2: a name was input
    else if (!nameOrId.includes(".")) {
      //we want to search *backwards*, to get most derived version;
      //we use slice().reverse() to clone before reversing since reverse modifies
      return this.stateVariableReferences
        .slice()
        .reverse()
        .find(({ definition }) => definition.name === nameOrId);
    }
    //case 3: a qualified name was input
    else {
      let [className, variableName] = nameOrId.split(".");
      //again, we'll search backwards, although, uhhh...?
      return this.stateVariableReferences
        .slice()
        .reverse()
        .find(
          ({ definition, definedIn }) =>
            definition.name === variableName && definedIn.name === className
        );
    }
  }

  private async getStorage(
    address: string,
    slot: BN,
    block: number
  ): Promise<Uint8Array> {
    //first, set up any preliminary layers as needed
    if (this.storageCache[block] === undefined) {
      this.storageCache[block] = {};
    }
    if (this.storageCache[block][address] === undefined) {
      this.storageCache[block][address] = {};
    }
    //now, if we have it cached, just return it
    if (this.storageCache[block][address][slot.toString()] !== undefined) {
      return this.storageCache[block][address][slot.toString()];
    }
    //otherwise, get it, cache it, and return it
    let word = CodecUtils.Conversion.toBytes(
      await this.web3.eth.getStorageAt(address, slot, block),
      CodecUtils.EVM.WORD_SIZE
    );
    this.storageCache[block][address][slot.toString()] = word;
    return word;
  }

  private async getCode(address: string, block: number): Promise<Uint8Array> {
    return await this.wireDecoder.getCode(address, block);
  }

  /**
   * Watches a mapping key; adds it to the decoder's list of watched mapping
   * keys.  This affects the results of both [[variables|variables()]] and
   * [[variable|variable()]].  When a mapping is decoded, only the values at
   * its watched keys will be included in its value.
   *
   * Note that it is possible
   * to watch mappings that are inside structs, arrays, other mappings, etc;
   * see below for more on how to do this.
   *
   * Note that watching mapping keys is
   * only possible in full mode; if the decoder wasn't able to start up in full
   * mode, this method will throw an exception.
   *
   * Warning: At the moment, this
   * function does very little to check its input.  Bad input may have
   * unpredictable results.  This will be remedied in the future (by having it
   * throw exceptions on bad input), but right now essentially no checking is
   * implemented.  Also, there may be slight changes to the format of indices
   * in the future.
   * @param variable The variable that the mapping lives under; this works like
   *   the nameOrId argument to [[variable|variable()]].  If the mapping is a
   *   top-level state variable, put the mapping itself here.  Otherwise, put the
   *   top-level state variable it lives under.
   * @param indices Further arguments to watchMappingKey, if given, will be
   *   interpreted as indices into or members of the variable identified by the
   *   variable argument; see the example.  Array indices and mapping
   *   keys are specified by value; struct members are specified by name or (if
   *   you know it) numeric ID.
   *
   *   Numeric values can be given as number, BN, or
   *   numeric string.  Bytestring values are given as hex strings.  Boolean
   *   values are given as booleans, or as the strings "true" or "false".
   *   Address values are given as hex strings; they are currently not required
   *   to be in checksum case, but this will likely change in the future, so
   *   don't rely on that.
   *
   *   Note that if the path to a given mapping key
   *   includes mapping keys above it, any ancestors will also be watched
   *   automatically.
   * @example First, a simple example.  Say we have a mapping `m` of type
   *   `mapping(uint => uint)`.  You could call `watchMappingKey("m", 0)` to
   *   watch `m[0]`.
   * @example Now for a slightly more complicated example.  Say `m` is of type
   *   `mapping(uint => mapping(uint => uint))`, then to watch `m[3][5]`, you
   *   can call `watchMappingKey("m", 3, 5)`.  This will also automatically
   *   watch `m[3]`; otherwise, watching `m[3][5]` wouldn't do much of
   *   anything.
   * @example Now for a well more complicated example.  Say we have a struct
   *   type `MapStruct` with a member called `map` which is a `mapping(string => string)`,
   *   and say we have a variable `arr` of type `MapStruct[]`, then one could
   *   watch `arr[3].map["hello"]` by calling `watchMappingKey("arr", 3, "map", "hello")`.
   */
  public watchMappingKey(variable: number | string, ...indices: any[]): void {
    this.checkAllocationSuccess();
    let slot: Slot | undefined = this.constructSlot(variable, ...indices)[0];
    //add mapping key and all ancestors
    debug("slot: %O", slot);
    while (
      slot !== undefined &&
      this.mappingKeys.every(
        existingSlot => !equalSlots(existingSlot, slot)
        //we put the newness requirement in the while condition rather than a
        //separate if because if we hit one ancestor that's not new, the futher
        //ones won't be either
      )
    ) {
      if (slot.key !== undefined) {
        //only add mapping keys
        this.mappingKeys = [...this.mappingKeys, slot];
      }
      slot = slot.path;
    }
  }

  /**
   * Opposite of [[watchMappingKey]]; unwatches the specified mapping key.  See
   * watchMappingKey for more on how watching mapping keys works, and on how
   * the parameters work.
   *
   * Note that unwatching a mapping key will also unwatch all its descendants.
   * E.g., if `m` is of type `mapping(uint => mapping(uint => uint))`, then
   * unwatching `m[0]` will also unwatch `m[0][0]`, `m[0][1]`, etc, if these
   * are currently watched.
   *
   * This function has the same caveats as watchMappingKey.
   */
  public unwatchMappingKey(variable: number | string, ...indices: any[]): void {
    this.checkAllocationSuccess();
    let slot: Slot | undefined = this.constructSlot(variable, ...indices)[0];
    if (slot === undefined) {
      return; //not strictly necessary, but may as well
    }
    //remove mapping key and all descendants
    this.mappingKeys = this.mappingKeys.filter(existingSlot => {
      while (existingSlot !== undefined) {
        if (equalSlots(existingSlot, slot)) {
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

  /**
   * See [[WireDecoder.decodeTransaction]].
   */
  public async decodeTransaction(
    transaction: Transaction
  ): Promise<DecoderTypes.DecodedTransaction> {
    return await this.wireDecoder.decodeTransaction(
      transaction,
      this.additionalContexts
    );
  }

  /**
   * See [[WireDecoder.decodeLog]].
   */
  public async decodeLog(log: Log): Promise<DecoderTypes.DecodedLog> {
    return await this.wireDecoder.decodeLog(log, {}, this.additionalContexts);
  }

  /**
   * See [[WireDecoder.decodeLogs]].
   */
  public async decodeLogs(logs: Log[]): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.decodeLogs(logs, {}, this.additionalContexts);
  }

  /**
   * See [[WireDecoder.abifyCalldataDecoding]].
   */
  public abifyCalldataDecoding(decoding: CalldataDecoding): CalldataDecoding {
    return this.wireDecoder.abifyCalldataDecoding(decoding);
  }

  /**
   * See [[WireDecoder.abifyLogDecoding]].
   */
  public abifyLogDecoding(decoding: LogDecoding): LogDecoding {
    return this.wireDecoder.abifyLogDecoding(decoding);
  }

  /**
   * This mostly behaves as [[WireDecoder.events]].
   * However, unlike other variants of this function, this one, by default, restricts to events originating from this instance's address.
   * If you don't want to restrict like that, you can explicitly use `address: undefined` in the options to disable this.
   * (You can also of course set a different address to restrict to that.)
   * @param options Used to determine what events to fetch; see the documentation on the [[EventOptions]] type for more.
   */
  public async events(
    options: DecoderTypes.EventOptions = {}
  ): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.events(
      { address: this.contractAddress, ...options },
      this.additionalContexts
    );
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
  private constructSlot(
    variable: number | string,
    ...indices: any[]
  ): [Slot | undefined, AstDefinition | undefined] {
    //base case: we need to locate the variable and its definition
    if (indices.length === 0) {
      let allocation = this.findVariableByNameOrId(variable);

      let definition = allocation.definition;
      let pointer = allocation.pointer;
      if (pointer.location !== "storage") {
        //i.e., if it's a constant
        return [undefined, undefined];
      }
      return [pointer.range.from.slot, definition];
    }

    //main case
    let parentIndices = indices.slice(0, -1); //remove last index
    let [parentSlot, parentDefinition] = this.constructSlot(
      variable,
      ...parentIndices
    );
    if (parentSlot === undefined) {
      return [undefined, undefined];
    }
    let rawIndex = indices[indices.length - 1];
    let index: any;
    let key: Values.ElementaryValue;
    let slot: Slot;
    let definition: AstDefinition;
    switch (DefinitionUtils.typeClass(parentDefinition)) {
      case "array":
        if (rawIndex instanceof BN) {
          index = rawIndex.clone();
        } else {
          index = new BN(rawIndex);
        }
        definition =
          parentDefinition.baseType || parentDefinition.typeName.baseType;
        let size = storageSize(
          definition,
          this.referenceDeclarations,
          this.allocations.storage
        );
        if (!isWordsLength(size)) {
          return [undefined, undefined];
        }
        slot = {
          path: parentSlot,
          offset: index.muln(size.words),
          hashPath: DefinitionUtils.isDynamicArray(parentDefinition)
        };
        break;
      case "mapping":
        let keyDefinition =
          parentDefinition.keyType || parentDefinition.typeName.keyType;
        key = wrapElementaryViaDefinition(
          rawIndex,
          keyDefinition,
          this.contract.compiler
        );
        definition =
          parentDefinition.valueType || parentDefinition.typeName.valueType;
        slot = {
          path: parentSlot,
          key,
          offset: new BN(0)
        };
        break;
      case "struct":
        let parentId = DefinitionUtils.typeId(parentDefinition);
        let allocation: StorageMemberAllocation;
        if (typeof rawIndex === "number") {
          index = rawIndex;
          allocation = this.allocations.storage[parentId].members[index];
          definition = allocation.definition;
        } else {
          allocation = Object.values(
            this.allocations.storage[parentId].members
          ).find(({ definition }) => definition.name === rawIndex); //there should be exactly one
          definition = allocation.definition;
          index = definition.id; //not really necessary, but may as well
        }
        slot = {
          path: parentSlot,
          //need type coercion here -- we know structs don't contain constants but the compiler doesn't
          offset: (<StoragePointer>(
            allocation.pointer
          )).range.from.slot.offset.clone()
        };
        break;
      default:
        return [undefined, undefined];
    }
    return [slot, definition];
  }
}
