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
  }

  public async init(): Promise<void> {
    this.contractNetwork = (await this.web3.eth.net.getId()).toString();

    debug("init called");
    this.referenceDeclarations = Utils.getReferenceDeclarations(Object.values(this.contractNodes));
    this.userDefinedTypes = Types.definitionsToStoredTypes(this.referenceDeclarations);

    this.allocations.storage = Decoder.getStorageAllocations(this.referenceDeclarations, {[this.contractNode.id]: this.contractNode});
    this.allocations.abi = Decoder.getAbiAllocations(this.referenceDeclarations);
    for(let contractNode of Object.values(this.contractNodes)) {
      let id = contractNode.id;
      let contract = this.contracts[id];
      this.allocations.event[id] = Decoder.getEventAllocations(
        contract.abi,
        this.referenceDeclarations,
        contractNode.linearizedBaseContracts,
        this.allocations.abi
      );
      let constructorContext = Object.values(contexts).find(
        ({ contractId, isConstructor }) =>
          contractId === id && isConstructor
      );
      this.allocations.calldata[id] = Decoder.getCalldataAllocations(
        contract.abi,
        this.referenceDeclarations,
        contractNode.linearizedBaseContracts,
        allocations.abi,
        constructorContext;
      );
    }
    debug("done with allocation");
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

  public decodeTransaction(transaction: Transaction): DecodedTransaction {
    const contractId = await this.getContractIdByAddress(transaction.to, transaction.blockNumber, transaction.input);
    if(contractId === null) {
      return {
        ...transaction,
        decoding: {
          kind: "fallback"
        }
      };
    }

    const data = DecodeUtils.Conversion.toBytes(transaction.input);
    const info: Decoder.EvmInfo = {
      state: {
        storage: {},
        calldata: data,
      },
      mappingKeys: this.mappingKeys,
      userDefinedTypes: this.userDefinedTypes,
      allocations: this.allocations,
      contexts: this.contexts
    };
    const decoder = Decoder.decodeCalldata(info, contractId);

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

  public decodeLog(log: Log): DecodedEvent {
    const contractId = await this.getContractIdByAddress(log.address, log.blockNumber);
    if(contractId === null) {
      return {
        ...transaction,
        decoding: {
          kind: "anonymous"
        }
      };
    }

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
      contexts: this.contexts
    };
    const decoder = Decoder.decodeEvent(info, this.contractNode.id);

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

  public decodeLogs(logs: Log[]): DecodedEvent[] {
    return logs.map(this.decodeLog);
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
  //and checks this against the known contexts to determine the contract ID
  //however, if this fails and constructorBinary is passed in, it will then also
  //attempt to determine it from that
  private async getContractIdByAddress(address: string, block: number, constructorBinary?: string): Promise<number | null> {
    let code = DecodeUtils.Conversion.toHexString(
      await this.getCode(address, block)
    );
    let context: DecoderContext;
    if(code.length === 0 && constructorBinary) {
      let 
      context = DecodeUtils.Contexts.findDecoderContext(this.contexts, constructorBinary);
    }
    else {
      context = DecodeUtils.Contexts.findDecoderContext(this.contexts, code);
    }
    if(context === null) {
      return null;
    }
    return context.contractId;
  }

}
