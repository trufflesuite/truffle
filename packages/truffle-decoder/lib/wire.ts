import debugModule from "debug";
const debug = debugModule("decoder:decoder");

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
import * as Codec from "truffle-codec";
import * as DecoderTypes from "./types";
import * as Utils from "./utils";

export default class TruffleWireDecoder extends AsyncEventEmitter {
  private web3: Web3;

  private network: string;

  private contracts: DecoderTypes.ContractMapping = {};
  private contractNodes: AstReferences = {};
  private contexts: DecodeUtils.Contexts.DecoderContexts = {};
  private contextsById: DecodeUtils.Contexts.DecoderContextsById = {}; //deployed contexts only
  private constructorContextsById: DecodeUtils.Contexts.DecoderContextsById = {};

  private referenceDeclarations: AstReferences;
  private userDefinedTypes: Types.TypesById;
  private allocations: {
    storage: Codec.StorageAllocations;
    abi: Codec.AbiAllocations;
    calldata: Codec.CalldataAllocations;
    event: Codec.EventAllocations;
  };

  private codeCache: DecoderTypes.CodeCache = {};

  constructor(contracts: ContractObject[], provider: Provider) {
    super();

    this.web3 = new Web3(provider);

    for(let contract of contracts) {
      let node: AstDefinition = Utils.getContractNode(contract);
      if(node !== undefined) {
        this.contracts[node.id] = contract;
        this.contractNodes[node.id] = node;
        if(contract.deployedBytecode) {
          const context = Utils.makeContext(contract, node);
          const hash = DecodeUtils.Conversion.toHexString(
            DecodeUtils.EVM.keccak256({type: "string",
              value: context.binary
            })
          );
          this.contexts[hash] = context;
        }
        if(contract.byteCode) {
          const constructorContext = Utils.makeContext(contract, node, true);
          const hash = DecodeUtils.Conversion.toHexString(
            DecodeUtils.EVM.keccak256({type: "string",
              value: constructorContext.binary
            })
          );
          this.contexts[hash] = constructorContext;
        }
      }
    }

    this.contexts = <DecodeUtils.Contexts.DecoderContexts>DecodeUtils.Contexts.normalizeContexts(this.contexts);
    this.contextsById = Object.assign({}, ...Object.values(this.contexts).filter(
      ({isConstructor}) => !isConstructor
    ).map(context =>
      ({[context.contractId]: context})
    ));
    this.constructorContextsById = Object.assign({}, ...Object.values(this.contexts).filter(
      ({isConstructor}) => isConstructor
    ).map(context =>
      ({[context.contractId]: context})
    ));
  }

  public async init(): Promise<void> {
    //note: this doesn't need to be async, but is for consistency

    debug("init called");
    [this.referenceDeclarations, this.userDefinedTypes] = this.getUserDefinedTypes();

    let allocationInfo: Codec.ContractAllocationInfo[] = Object.entries(this.contracts).map(
      ([id, { abi }]) => ({
        abi,
        id: parseInt(id),
        constructorContext: this.constructorContextsById[parseInt(id)]
      })
    );

    this.allocations.storage = Codec.getStorageAllocations(this.referenceDeclarations, this.contractNodes);
    this.allocations.abi = Codec.getAbiAllocations(this.referenceDeclarations);
    this.allocations.calldata = Codec.getCalldataAllocations(allocationInfo, this.referenceDeclarations, this.allocations.abi);
    this.allocations.event = Codec.getEventAllocations(allocationInfo, this.referenceDeclarations, this.allocations.abi);
    debug("done with allocation");
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
	  types[node.id] = Types.definitionToStoredType(node, compiler);
	}
      }
    }
    return [references, types];
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

  public async decodeTransaction(transaction: Transaction): Promise<DecoderTypes.DecodedTransaction> {
    const block = transaction.blockNumber;
    const context = await this.getContextByAddress(transaction.to, block, transaction.input);

    const data = DecodeUtils.Conversion.toBytes(transaction.input);
    const info: Codec.EvmInfo = {
      state: {
        storage: {},
        calldata: data,
      },
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contextsById,
      currentContext: context
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

  public async decodeLog(log: Log): Promise<DecoderTypes.DecodedEvent> {
    const block = log.blockNumber;
    const data = DecodeUtils.Conversion.toBytes(log.data);
    const topics = log.topics.map(DecodeUtils.Conversion.toBytes);
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
    const decoder = Codec.decodeEvent(info);

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
    const decoding = <Codec.EventDecoding>result.value;
    
    return {
      ...log,
      decoding
    };
  }

  public async decodeLogs(logs: Log[]): Promise<DecoderTypes.DecodedEvent[]> {
    return await Promise.all(logs.map(this.decodeLog));
  }

  public async events(name: string | null = null, fromBlock: BlockType = "latest", toBlock: BlockType = "latest"): Promise<DecoderTypes.DecodedEvent[]> {
    const logs = await this.web3.eth.getPastLogs({
      fromBlock,
      toBlock,
    });

    let events = await this.decodeLogs(logs);

    if(name !== null) {
      events = events.filter(event =>
        event.decoding.kind === "event"
        && event.decoding.name === name
      );
    }

    return events;
  }

  public onEvent(name: string, callback: Function): void {
    //this.web3.eth.subscribe(name);
  }

  public removeEventListener(name: string): void {
  }

  //normally, this function gets the code of the given address at the given block,
  //and checks this against the known contexts to determine the contract type
  //however, if this fails and constructorBinary is passed in, it will then also
  //attempt to determine it from that
  private async getContextByAddress(address: string, block: number, constructorBinary?: string): Promise<DecodeUtils.Contexts.DecoderContext | null> {
    let code: string;
    if(address !== null) {
      code = DecodeUtils.Conversion.toHexString(
        await this.getCode(address, block)
      );
    }
    else if(constructorBinary) {
      code = constructorBinary;
    }
    //otherwise... we have a problem
    return DecodeUtils.Contexts.findDecoderContext(this.contexts, code);
  }
}
