import debugModule from "debug";
const debug = debugModule("decoder:decoders");

import * as Codec from "@truffle/codec";
import {
  Abi,
  Ast,
  Evm,
  Format,
  Conversion,
  Storage,
  Contexts,
  Pointer,
  CalldataDecoding,
  LogDecoding,
  decodeCalldata,
  decodeEvent
} from "@truffle/codec";
import * as Utils from "./utils";
import * as Allocation from "@truffle/codec/allocate/types";
import * as DecoderTypes from "./types";
import Web3 from "web3";
import { ContractObject } from "@truffle/contract-schema/spec";
import BN from "bn.js";
import { BlockType, Transaction } from "web3/eth/types";
import { Log } from "web3/types";
import { Provider } from "web3/providers";
import {
  ContractBeingDecodedHasNoNodeError,
  ContractAllocationFailedError,
  InvalidAddressError,
  VariableNotFoundError
} from "./errors";

/**
 * The WireDecoder class.  Decodes transactions and logs.  See below for a method listing.
 * @category Decoder
 */
export class WireDecoder {
  private web3: Web3;

  private network: string;

  private contracts: DecoderTypes.ContractMapping = {};
  private contractNodes: Ast.AstNodes = {};
  private contexts: Contexts.DecoderContexts = {}; //all contexts
  private deployedContexts: Contexts.DecoderContexts = {};

  private referenceDeclarations: Ast.AstNodes;
  private userDefinedTypes: Format.Types.TypesById;
  private allocations: Evm.AllocationInfo;

  private codeCache: DecoderTypes.CodeCache = {};

  /**
   * @protected
   */
  constructor(contracts: ContractObject[], provider: Provider) {
    this.web3 = new Web3(provider);

    let contractsAndContexts: DecoderTypes.ContractAndContexts[] = [];

    for (let contract of contracts) {
      let node: Ast.AstNode = Utils.getContractNode(contract);
      let deployedContext: Contexts.DecoderContext | undefined = undefined;
      let constructorContext: Contexts.DecoderContext | undefined = undefined;
      if (node !== undefined) {
        this.contracts[node.id] = contract;
        this.contractNodes[node.id] = node;
      }
      if (contract.deployedBytecode && contract.deployedBytecode !== "0x") {
        deployedContext = Utils.makeContext(contract, node);
        this.contexts[deployedContext.context] = deployedContext;
        //note that we don't set up deployedContexts until after normalization!
      }
      if (contract.bytecode && contract.bytecode !== "0x") {
        constructorContext = Utils.makeContext(contract, node, true);
        this.contexts[constructorContext.context] = constructorContext;
      }
      contractsAndContexts.push({
        contract,
        node,
        deployedContext,
        constructorContext
      });
    }

    this.contexts = <Contexts.DecoderContexts>(
      Contexts.Utils.normalizeContexts(this.contexts)
    );
    this.deployedContexts = Object.assign(
      {},
      ...Object.values(this.contexts).map(
        context =>
          !context.isConstructor ? { [context.context]: context } : {}
      )
    );

    for (let contractAndContexts of contractsAndContexts) {
      //change everything to normalized version
      if (contractAndContexts.deployedContext) {
        contractAndContexts.deployedContext = this.contexts[
          contractAndContexts.deployedContext.context
        ]; //get normalized version
      }
      if (contractAndContexts.constructorContext) {
        contractAndContexts.constructorContext = this.contexts[
          contractAndContexts.constructorContext.context
        ]; //get normalized version
      }
    }

    ({
      definitions: this.referenceDeclarations,
      types: this.userDefinedTypes
    } = this.collectUserDefinedTypes());

    let allocationInfo: Allocation.ContractAllocationInfo[] = contractsAndContexts.map(
      ({
        contract: { abi, compiler },
        node,
        deployedContext,
        constructorContext
      }) => ({
        abi: Abi.Utils.schemaAbiToAbi(abi),
        compiler,
        contractNode: node,
        deployedContext,
        constructorContext
      })
    );
    debug("allocationInfo: %O", allocationInfo);

    this.allocations = {};
    this.allocations.abi = Abi.Allocate.getAbiAllocations(
      this.userDefinedTypes
    );
    this.allocations.storage = Storage.Allocate.getStorageAllocations(
      this.referenceDeclarations,
      {}
    ); //not used by wire decoder itself, but used by contract decoder
    this.allocations.calldata = Abi.Allocate.getCalldataAllocations(
      allocationInfo,
      this.referenceDeclarations,
      this.userDefinedTypes,
      this.allocations.abi
    );
    this.allocations.event = Abi.Allocate.getEventAllocations(
      allocationInfo,
      this.referenceDeclarations,
      this.userDefinedTypes,
      this.allocations.abi
    );
    debug("done with allocation");
  }

  private collectUserDefinedTypes(): {
    definitions: Ast.AstNodes;
    types: Format.Types.TypesById;
  } {
    let references: Ast.AstNodes = {};
    let types: Format.Types.TypesById = {};
    for (const id in this.contracts) {
      const compiler = this.contracts[id].compiler;
      //first, add the contract itself
      const contractNode = this.contractNodes[id];
      references[id] = contractNode;
      types[id] = Format.Utils.MakeType.definitionToStoredType(
        contractNode,
        compiler
      );
      //now, add its struct and enum definitions
      for (const node of contractNode.nodes) {
        if (
          node.nodeType === "StructDefinition" ||
          node.nodeType === "EnumDefinition"
        ) {
          references[node.id] = node;
          //HACK even though we don't have all the references, we only need one:
          //the reference to the contract itself, which we just added, so we're good
          types[node.id] = Format.Utils.MakeType.definitionToStoredType(
            node,
            compiler,
            references
          );
        }
      }
    }
    return { definitions: references, types };
  }

  /**
   * @protected
   * for internal use
   */
  public async getCode(address: string, block: number): Promise<Uint8Array> {
    //first, set up any preliminary layers as needed
    if (this.codeCache[block] === undefined) {
      this.codeCache[block] = {};
    }
    //now, if we have it cached, just return it
    if (this.codeCache[block][address] !== undefined) {
      return this.codeCache[block][address];
    }
    //otherwise, get it, cache it, and return it
    let code = Conversion.toBytes(await this.web3.eth.getCode(address, block));
    this.codeCache[block][address] = code;
    return code;
  }

  /**
   * Takes a Web3
   * [Transaction](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#eth-gettransaction-return)
   * object and returns a copy of that object but with an additional decoding
   * field.  This field holds a [[CalldataDecoding]]; see the documentation on
   * [[DecodedTransaction]] for more.
   *
   * Note that decoding of transactions sent to libraries is presently not
   * supported and may have unreliable results.  Limited support for this is
   * planned for future versions.
   * @param transaction The transaction to be decoded.
   * @param additionalContexts For internal use only; please don't use this.
   */
  public async decodeTransaction(
    transaction: Transaction,
    additionalContexts: Contexts.DecoderContexts = {}
  ): Promise<DecoderTypes.DecodedTransaction> {
    debug("transaction: %O", transaction);
    const block = transaction.blockNumber;
    const isConstructor = transaction.to === null;
    const context = await this.getContextByAddress(
      transaction.to,
      block,
      transaction.input,
      additionalContexts
    );

    const data = Conversion.toBytes(transaction.input);
    const info: Evm.EvmInfo = {
      state: {
        storage: {},
        calldata: data
      },
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: { ...this.deployedContexts, ...additionalContexts },
      currentContext: context
    };
    const decoder = decodeCalldata(info, isConstructor);

    let result = decoder.next();
    while (result.done === false) {
      let request = result.value;
      let response: Uint8Array;
      switch (request.type) {
        case "code":
          response = await this.getCode(request.address, block);
          break;
        //not writing a storage case as it shouldn't occur here!
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value
    const decoding = result.value;

    return {
      ...transaction,
      decoding
    };
  }

  /**
   * Takes a Web3
   * [Log](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#eth-getpastlogs-return)
   * object and returns a copy of that object but with an additional decodings
   * field.  This field holds an array of [[LogDecoding|LogDecodings]]; see the
   * documentation on [[DecodedLog]] for more.
   * @param log The log to be decoded.
   */
  public async decodeLog(log: Log) {
    return await this.decodeLogWithAdditionalOptions(log);
  }

  /**
   * @protected
   */
  public async decodeLogWithAdditionalOptions(
    log: Log,
    options: DecoderTypes.EventOptions = {},
    additionalContexts: Contexts.DecoderContexts = {}
  ): Promise<DecoderTypes.DecodedLog> {
    const block = log.blockNumber;
    const data = Conversion.toBytes(log.data);
    const topics = log.topics.map(Conversion.toBytes);
    const info: Evm.EvmInfo = {
      state: {
        storage: {},
        eventdata: data,
        eventtopics: topics
      },
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: { ...this.deployedContexts, ...additionalContexts }
    };
    const decoder = decodeEvent(info, log.address, options.name);

    let result = decoder.next();
    while (result.done === false) {
      let request = result.value;
      let response: Uint8Array;
      switch (request.type) {
        case "code":
          response = await this.getCode(request.address, block);
          break;
        //not writing a storage case as it shouldn't occur here!
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value
    const decodings = result.value;

    return {
      ...log,
      decodings
    };
  }

  /**
   * Similar to [[decodeLog]], but operates on an array of logs and decodes them all.
   * @param logs The logs to be decoded.
   */
  public async decodeLogs(logs: Log[]) {
    return await this.decodeLogsWithAdditionalOptions(logs);
  }

  /**
   * @protected
   */
  public async decodeLogsWithAdditionalOptions(
    logs: Log[],
    options: DecoderTypes.EventOptions = {},
    additionalContexts: Contexts.DecoderContexts = {}
  ): Promise<DecoderTypes.DecodedLog[]> {
    return await Promise.all(
      logs.map(log =>
        this.decodeLogWithAdditionalOptions(log, options, additionalContexts)
      )
    );
  }

  /**
   * Gets all events meeting certain conditions and decodes them.
   * This function is fairly rudimentary at the moment but more functionality
   * will be added in the future.
   * @param options Used to determine what events to fetch; see the documentation
   *   on the [[EventOptions]] type for more.
   * @example `events({name: "TestEvent"})` -- get events named "TestEvent"
   *   from the most recent block
   */
  public async events(options: DecoderTypes.EventOptions = {}) {
    return await this.eventsWithAdditionalContexts(options);
  }

  /**
   * @protected
   */
  public async eventsWithAdditionalContexts(
    options: DecoderTypes.EventOptions = {},
    additionalContexts: Contexts.DecoderContexts = {}
  ): Promise<DecoderTypes.DecodedLog[]> {
    let { address, name, fromBlock, toBlock } = options;

    const logs = await this.web3.eth.getPastLogs({
      address,
      fromBlock,
      toBlock
    });

    let events = await this.decodeLogsWithAdditionalOptions(
      logs,
      options,
      additionalContexts
    );
    debug("events: %o", events);

    //if a target name was specified, we'll restrict to events that decoded
    //to something with that name.  (note that only decodings with that name
    //will have been returned from decodeLogs in the first place)
    if (name !== undefined) {
      events = events.filter(event => event.decodings.length > 0);
    }

    return events;
  }

  /**
   * Takes a [[CalldataDecoding]], which may have been produced in full mode or ABI mode,
   * and converts it to its ABI mode equivalent.  See the README for more information.
   *
   * Please only use on decodings produced by this same decoder instance; use
   * on decodings produced by other instances may not work consistently.
   * @param decoding The decoding to abify
   */
  public abifyCalldataDecoding(decoding: CalldataDecoding): CalldataDecoding {
    return Codec.abifyCalldataDecoding(decoding, this.userDefinedTypes);
  }

  /**
   * Takes a [[LogDecoding]], which may have been produced in full mode or ABI mode,
   * and converts it to its ABI mode equivalent.  See the README for more information.
   *
   * Please only use on decodings produced by this same decoder instance; use
   * on decodings produced by other instances may not work consistently.
   * @param decoding The decoding to abify
   */
  public abifyLogDecoding(decoding: LogDecoding): LogDecoding {
    return Codec.abifyLogDecoding(decoding, this.userDefinedTypes);
  }

  //normally, this function gets the code of the given address at the given block,
  //and checks this against the known contexts to determine the contract type
  //however, if this fails and constructorBinary is passed in, it will then also
  //attempt to determine it from that
  private async getContextByAddress(
    address: string,
    block: number,
    constructorBinary?: string,
    additionalContexts: Contexts.DecoderContexts = {}
  ): Promise<Contexts.DecoderContext | null> {
    let code: string;
    if (address !== null) {
      code = Conversion.toHexString(await this.getCode(address, block));
    } else if (constructorBinary) {
      code = constructorBinary;
    }
    //if neither of these hold... we have a problem
    let contexts = { ...this.contexts, ...additionalContexts };
    return Contexts.Utils.findDecoderContext(contexts, code);
  }

  //finally: the spawners!

  /**
   * Constructs a contract decoder for a given contract artifact.
   * @param artifact The artifact for the contract.
   *
   *   A contract constructor object may be substituted for the artifact, so if
   *   you're not sure which you're dealing with, it's OK.
   *
   *   Note: The artifact must be one of the ones used to initialize the wire
   *   decoder; otherwise you will have problems.
   */
  public async forArtifact(artifact: ContractObject): Promise<ContractDecoder> {
    let contractDecoder = new ContractDecoder(artifact, this);
    await contractDecoder.init();
    return contractDecoder;
  }

  /**
   * Constructs a contract instance decoder for a given instance of a contract in this
   * project.
   * @param artifact The artifact for the contract.
   *
   *   A contract constructor object may be substituted for the artifact, so if
   *   you're not sure which you're dealing with, it's OK.
   *
   *   Note: The artifact must be one of the ones used to initialize the wire
   *   decoder; otherwise you will have problems.
   * @param address The address of the contract instance decode.  If left out, it will be autodetected.
   *   If an invalid address is provided, this method will throw an exception.
   */
  public async forInstance(
    artifact: ContractObject,
    address?: string
  ): Promise<ContractInstanceDecoder> {
    let contractDecoder = await this.forArtifact(artifact);
    return await contractDecoder.forInstance(address);
  }

  //the following functions are intended for internal use only

  /**
   * @protected
   */
  public getReferenceDeclarations(): Ast.AstNodes {
    return this.referenceDeclarations;
  }

  /**
   * @protected
   */
  public getUserDefinedTypes(): Format.Types.TypesById {
    return this.userDefinedTypes;
  }

  /**
   * @protected
   */
  public getAllocations(): Evm.AllocationInfo {
    return {
      abi: this.allocations.abi,
      storage: this.allocations.storage
    };
  }

  /**
   * @protected
   */
  public getWeb3(): Web3 {
    return this.web3;
  }

  /**
   * @protected
   */
  public getDeployedContexts(): Contexts.DecoderContexts {
    return this.deployedContexts;
  }
}

/**
 * The ContractDecoder class.  Spawns the [[ContractInstanceDecoder]] class.
 * Also, decodes transactions and logs.  See below for a method listing.
 * @category Decoder
 */
export class ContractDecoder {
  private web3: Web3;

  private contexts: Contexts.DecoderContexts; //note: this is deployed contexts only!

  private contract: ContractObject;
  private contractNode: Ast.AstNode;
  private contractNetwork: string;
  private contextHash: string;

  private allocations: Codec.Evm.AllocationInfo;
  private stateVariableReferences: Allocation.StorageMemberAllocation[];

  private wireDecoder: WireDecoder;

  /**
   * @protected
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
      this.allocations.storage = Storage.Allocate.getStorageAllocations(
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
   * @protected
   */
  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();
  }

  /**
   * Constructs a contract instance decoder for a given instance of this contract.
   * @param address The address of the contract instance decode.  If left out, it will be autodetected.
   *   If an invalid address is provided, this method will throw an exception.
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
   * @protected
   */
  public getAllocations() {
    return this.allocations;
  }

  /**
   * @protected
   */
  public getStateVariableReferences() {
    return this.stateVariableReferences;
  }

  /**
   * @protected
   */
  public getWireDecoder() {
    return this.wireDecoder;
  }

  /**
   * @protected
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
  contractNode: Ast.AstNode;
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
 * @category Decoder
 */
export class ContractInstanceDecoder {
  private web3: Web3;

  private contract: ContractObject;
  private contractNode: Ast.AstNode;
  private contractNetwork: string;
  private contractAddress: string;
  private contractCode: string;
  private contextHash: string;

  private contexts: Contexts.DecoderContexts = {}; //deployed contexts only
  private additionalContexts: Contexts.DecoderContexts = {}; //for passing to wire decoder when contract has no deployedBytecode

  private referenceDeclarations: Ast.AstNodes;
  private userDefinedTypes: Format.Types.TypesById;
  private allocations: Codec.Evm.AllocationInfo;

  private stateVariableReferences: Allocation.StorageMemberAllocation[];

  private mappingKeys: Storage.Slot[] = [];

  private storageCache: DecoderTypes.StorageCache = {};

  private contractDecoder: ContractDecoder;
  private wireDecoder: WireDecoder;

  /**
   * @protected
   */
  constructor(contractDecoder: ContractDecoder, address?: string) {
    this.contractDecoder = contractDecoder;
    this.wireDecoder = this.contractDecoder.getWireDecoder();
    this.web3 = this.wireDecoder.getWeb3();
    if (address !== undefined) {
      if (!this.web3.utils.isAddress(address)) {
        throw new InvalidAddressError(address);
      }
      this.contractAddress = this.web3.utils.toChecksumAddress(address);
    }

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
   * @protected
   */
  public async init(): Promise<void> {
    this.contractCode = Conversion.toHexString(
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
      this.additionalContexts = <Contexts.DecoderContexts>(
        Contexts.Utils.normalizeContexts(this.additionalContexts)
      );
      //again, since the code did not have unresolved link references, it is safe to just
      //mash these together like I'm about to
      this.contexts = { ...this.contexts, ...this.additionalContexts };
    }
  }

  private get context(): Contexts.DecoderContext {
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
    variable: Allocation.StorageMemberAllocation,
    block: number
  ): Promise<DecoderTypes.StateVariable> {
    const info: Codec.Evm.EvmInfo = {
      state: {
        storage: {}
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contexts,
      currentContext: this.context
    };

    const decoder = Codec.decodeVariable(
      variable.definition,
      variable.pointer,
      info
    );

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
      class: <Format.Types.ContractType>(
        this.userDefinedTypes[variable.definedIn.id]
      ),
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
      class: Contexts.Utils.contextToType(this.context),
      address: this.contractAddress,
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
  ): Promise<DecoderTypes.StateVariable[]> {
    this.checkAllocationSuccess();

    let blockNumber =
      typeof block === "number"
        ? block
        : (await this.web3.eth.getBlock(block)).number;

    let result: DecoderTypes.StateVariable[] = [];

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
   * If the variable can't be located, throws an exception.
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
  ): Promise<Format.Values.Result | undefined> {
    this.checkAllocationSuccess();

    let blockNumber =
      typeof block === "number"
        ? block
        : (await this.web3.eth.getBlock(block)).number;

    let variable = this.findVariableByNameOrId(nameOrId);

    if (variable === undefined) {
      //if user put in a bad name
      throw new VariableNotFoundError(nameOrId);
    }

    return (await this.decodeVariable(variable, blockNumber)).value;
  }

  private findVariableByNameOrId(
    nameOrId: string | number
  ): Allocation.StorageMemberAllocation | undefined {
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
    let word = Conversion.toBytes(
      await this.web3.eth.getStorageAt(address, slot, block),
      Codec.Evm.Utils.WORD_SIZE
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
   * **Warning**: At the moment, this function does very little to check its
   * input.  Bad input may have unpredictable results.  This will be remedied
   * in the future (by having it throw exceptions on bad input), but right now
   * essentially no checking is implemented.  Also, there may be slight changes
   * to the format of indices in the future.
   *
   * (A bad variable name will cause an exception though; that input is checked.)
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
  public async watchMappingKey(
    variable: number | string,
    ...indices: any[]
  ): Promise<void> {
    this.checkAllocationSuccess();
    let slot: Storage.Slot | undefined = this.constructSlot(
      variable,
      ...indices
    )[0];
    //add mapping key and all ancestors
    debug("slot: %O", slot);
    while (
      slot !== undefined &&
      this.mappingKeys.every(
        existingSlot => !Storage.Utils.equalSlots(existingSlot, slot)
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
  public async unwatchMappingKey(
    variable: number | string,
    ...indices: any[]
  ): Promise<void> {
    this.checkAllocationSuccess();
    let slot: Storage.Slot | undefined = this.constructSlot(
      variable,
      ...indices
    )[0];
    if (slot === undefined) {
      return; //not strictly necessary, but may as well
    }
    //remove mapping key and all descendants
    this.mappingKeys = this.mappingKeys.filter(existingSlot => {
      while (existingSlot !== undefined) {
        if (Storage.Utils.equalSlots(existingSlot, slot)) {
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
    return await this.wireDecoder.decodeLogWithAdditionalOptions(
      log,
      {},
      this.additionalContexts
    );
  }

  /**
   * See [[WireDecoder.decodeLogs]].
   */
  public async decodeLogs(logs: Log[]): Promise<DecoderTypes.DecodedLog[]> {
    return await this.wireDecoder.decodeLogsWithAdditionalOptions(
      logs,
      {},
      this.additionalContexts
    );
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
    return await this.wireDecoder.eventsWithAdditionalContexts(
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
  ): [Storage.Slot | undefined, Ast.AstNode | undefined] {
    //base case: we need to locate the variable and its definition
    if (indices.length === 0) {
      let allocation = this.findVariableByNameOrId(variable);
      if (!allocation) {
        throw new VariableNotFoundError(variable);
      }

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
    let key: Format.Values.ElementaryValue;
    let slot: Storage.Slot;
    let definition: Ast.AstNode;
    switch (Ast.Utils.typeClass(parentDefinition)) {
      case "array":
        if (rawIndex instanceof BN) {
          index = rawIndex.clone();
        } else {
          index = new BN(rawIndex);
        }
        definition =
          parentDefinition.baseType || parentDefinition.typeName.baseType;
        let size = Storage.Allocate.storageSize(
          definition,
          this.referenceDeclarations,
          this.allocations.storage
        );
        if (!Storage.Utils.isWordsLength(size)) {
          return [undefined, undefined];
        }
        slot = {
          path: parentSlot,
          offset: index.muln(size.words),
          hashPath: Ast.Utils.isDynamicArray(parentDefinition)
        };
        break;
      case "mapping":
        let keyDefinition =
          parentDefinition.keyType || parentDefinition.typeName.keyType;
        key = Utils.wrapElementaryViaDefinition(
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
        let parentId = Ast.Utils.typeId(parentDefinition);
        let allocation: Allocation.StorageMemberAllocation;
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
          offset: (<Pointer.StoragePointer>(
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
