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
import * as Decoder from "truffle-decoder-core";
import * as DecoderTypes from "./types";
import * as Utils from "./utils";

export default class TruffleWireDecoder extends AsyncEventEmitter {
  private web3: Web3;

  private network: string;

  private contracts: DecoderTypes.ContractMapping = {};
  private contractNodes: AstReferences = {};
  private contexts: DecodeUtils.Contexts.DecoderContexts = {};
  private contextsById: DecodeUtils.Contexts.DecoderContextsById = {}; //deployed contexts only

  private referenceDeclarations: AstReferences;
  private userDefinedTypes: Types.TypesById;
  private allocations: {
    storage: Decoder.StorageAllocations;
    abi: Decoder.AbiAllocations;
    calldata: Decoder.CalldataAllocations;
    event: Decoder.EventAllocations;
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
          const context = makeContext(contract, node);
          const hash = DecodeUtils.Conversion.toHexString(
            DecodeUtils.EVM.keccak256({type: "string",
              value: context.binary
            })
          );
          this.contexts[hash] = context;
        }
        if(contract.byteCode) {
          const constructorContext = makeContext(contract, node, true);
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
  }

  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();

    debug("init called");
    [this.referenceDeclarations, this.userDefinedTypes] = this.getUserDefinedTypes();

    this.allocations.storage = Decoder.getStorageAllocations(this.referenceDeclarations, {[this.contractNode.id]: this.contractNode});
    this.allocations.abi = Decoder.getAbiAllocations(this.referenceDeclarations);
    this.allocations.event = {};
    for(let contractNode of Object.values(this.contractNodes)) {
      let id = contractNode.id;
      let contract = this.contracts[id];
      Object.assign(this.allocations.event,
        Decoder.getEventAllocations(
          contract.abi,
          id,
          this.referenceDeclarations,
          this.allocations.abi
        )
      );
      let constructorContext = Object.values(contexts).find(
        ({ contractId, isConstructor }) =>
          contractId === id && isConstructor
      );
      this.allocations.calldata[id] = Decoder.getCalldataAllocations(
        contract.abi,
        id,
        this.referenceDeclarations,
        this.allocations.abi,
        constructorContext
      );
    }
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

  public async decodeTransaction(transaction: Transaction): DecodedTransaction {
    const context = await this.getContextByAddress(transaction.to, transaction.blockNumber, transaction.input);

    const data = DecodeUtils.Conversion.toBytes(transaction.input);
    const info: Decoder.EvmInfo = {
      state: {
        storage: {},
        calldata: data,
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contextsById,
      currentContext: context
    };
    //TODO: remove redundancy here
    const decoder = Decoder.decodeCalldata(info, context);

    let result = decoder.next();
    while(!result.done) {
      let request = <Decoder.DecoderRequest>(result.value);
      let response: Uint8Array;
      //only code requests should occur here
      if(Decoder.isCodeRequest(request)) {
        response = await this.getCode(request.address, block);
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value
    const decoding = <CalldataDecoding>result.value;
    
    return {
      ...transaction,
      decoding
    };
  }

  public async decodeLog(log: Log): DecodedEvent {
    const block = log.blockNumber;
    const data = DecodeUtils.Conversion.toBytes(log.data);
    const topics = log.topics.map(DecodeUtils.Conversion.toBytes);
    const info: Decoder.EvmInfo = {
      state: {
        storage: {},
        eventdata: data,
        eventtopics: topics
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contextsById,
      libraryEventsTable: this.libraryEventsTable
    };
    const decoder = Decoder.decodeEvent(info);

    let result = decoder.next();
    while(!result.done) {
      let request = <Decoder.DecoderRequest>(result.value);
      let response: Uint8Array;
      //only code requests should occur here
      if(Decoder.isCodeRequest(request)) {
        response = await this.getCode(request.address, block);
      }
      result = decoder.next(response);
    }
    //at this point, result.value holds the final value
    const decoding = <EventDecoding>result.value;
    
    return {
      ...log,
      decoding
    };
  }

  public async decodeLogs(logs: Log[]): DecodedEvent[] {
    return await Promise.all(logs.map(this.decodeLog));
  }

  public async events(name: string | null = null, fromBlock: BlockType = "latest", toBlock: BlockType = "latest"): Promise<DecoderTypes.DecodedEvent[]> {
    const logs = await web3.eth.getPastLogs({
      fromBlock,
      toBlock,
    });

    let events = this.decodeLogs(logs);

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
  private async getContextByAddress(address: string, block: number, constructorBinary?: string): Promise<number | null> {
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
