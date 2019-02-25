import debugModule from "debug";
const debug = debugModule("decoder:interface:contract-decoder");

import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { EvmInfo } from "../types/evm";
import * as general from "../allocate/general";
import * as storage from "../allocate/storage";
import { StoragePointer } from "../types/pointer";
import { StorageAllocations, StorageMemberAllocations } from "../types/allocation";
import decode from "../decode";
import { Definition as DefinitionUtils, EVM, AstDefinition, AstReferences } from "truffle-decode-utils";
import { BlockType, Transaction } from "web3/eth/types";
import { EventLog, Log } from "web3/types";
import { Provider } from "web3/providers";
import abiDecoder from "abi-decoder";

export interface EvmMapping {
  name: string;
  type: string;
  id: number;
  keyType: string;
  valueType: string;
  members: {
    [key: string]: EvmVariable;
  };
};

export interface EvmStruct {
  name: string;
  type: string;
  members: {
    [name: string]: DecodedVariable;
  };
};

export interface EvmEnum {
  type: string;
  value: string;
};

type EvmVariable = BN | string | EvmMapping | EvmStruct | EvmEnum;

interface DecodedVariable {
  name: string;
  type: string;
  value: EvmVariable;
};

interface ContractState {
  name: string;
  balance: BN;
  variables: {
    [name: string]: DecodedVariable
  };
};

interface ContractEvent {
  logIndex: number;
  name: string;
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  variables: {
    [name: string]: DecodedVariable
  }
};

export interface ContractMapping {
  [nodeId: number]: ContractObject;
};

export function getContractNode(contract: ContractObject): AstDefinition {
  for (let j = 0; j < contract.ast.nodes.length; j++) {
    const contractNode = contract.ast.nodes[j];
    const nodeMatchesContract =
      contractNode.name === contract.contractName ||
      contractNode.name === contract.contract_name;
    if (contractNode.nodeType === "ContractDefinition" && nodeMatchesContract) {
      return contractNode;
    }
  }

  return undefined;
}

export default class TruffleContractDecoder extends AsyncEventEmitter {
  private web3: Web3;

  private contract: ContractObject;
  private contractNode: AstDefinition;
  private contractNetwork: string;
  private contractAddress: string;
  private inheritedContracts: ContractObject[];

  private contracts: ContractMapping = {};
  private contractNodes: AstReferences = {};

  private referenceDeclarations: AstReferences;
  private storageAllocations: StorageAllocations;

  private eventDefinitions: AstReferences;
  private eventDefinitionIdsByName: {
    [name: string]: number
  };

  private stateVariableReferences: StorageMemberAllocations;

  constructor(contract: ContractObject, inheritedContracts: ContractObject[], provider: Provider) {
    super();

    this.web3 = new Web3(provider);

    this.contract = contract; //cloneDeep(contract);
    this.inheritedContracts = inheritedContracts; //cloneDeep(inheritedContracts);

    this.contractNetwork = Object.keys(this.contract.networks)[0];
    this.contractAddress = this.contract.networks[this.contractNetwork].address;

    this.contractNode = getContractNode(this.contract);

    this.contracts[this.contractNode.id] = this.contract;
    this.contractNodes[this.contractNode.id] = this.contractNode;
    abiDecoder.addABI(this.contract.abi);
    this.inheritedContracts.forEach((inheritedContract) => {
      let node: AstDefinition = getContractNode(inheritedContract);
      this.contracts[node.id] = inheritedContract;
      this.contractNodes[node.id] = node;
      abiDecoder.addABI(inheritedContract.abi);
    });
  }

  public init(): void {
    debug("init called");
    this.referenceDeclarations = general.getReferenceDeclarations(Object.values(this.contractNodes));

    this.eventDefinitions = general.getEventDefinitions(Object.values(this.contractNodes));
    this.eventDefinitionIdsByName = {};
    for (let id in this.eventDefinitions) {
      this.eventDefinitionIdsByName[this.eventDefinitions[id].name] = parseInt(id);
        //this parseInt shouldn't be necessary, but TypeScript refuses to believe
        //that id must be a number even though the definition of AstReferences
        //says so
    }
    debug("done with event definitions");

    this.storageAllocations = storage.getStorageAllocations(this.referenceDeclarations, {[this.contractNode.id]: this.contractNode});
    debug("done with allocation");
    this.stateVariableReferences = this.storageAllocations[this.contractNode.id].members;
    debug("stateVariableReferences %O", this.stateVariableReferences);
  }

  public async state(block: BlockType = "latest"): Promise<ContractState | undefined> {
    let result: ContractState = {
      name: this.contract.contractName,
      balance: new BN(await this.web3.eth.getBalance(this.contractAddress)),
      variables: {}
    };

    debug("state called");

    for(const variable of Object.values(this.stateVariableReferences)) {

      const info: EvmInfo = {
        state: {
          stack: [],
          storage: {},
          memory: new Uint8Array(0)
        },
        mappingKeys: [],
        referenceDeclarations: this.referenceDeclarations,
        storageAllocations: this.storageAllocations,
        variables: this.stateVariableReferences
      };

      debug("about to decode %s", variable.definition.name);
      const val = await decode(variable.definition, variable.pointer, info, this.web3, this.contractAddress);
      debug("decoded");

      result.variables[variable.definition.name] = <DecodedVariable>{
        name: variable.definition.name,
        type: DefinitionUtils.typeClass(variable.definition),
        value: val
      };

      debug("var %O", result.variables[variable.definition.name]);
    }

    return result;
  }

  public async variable(name: string, block: BlockType = "latest"): Promise<DecodedVariable | undefined> {
    return undefined;
  }

  public watchMappingKeys(mappingId: number, keys: (number | BN | string)[]): void {
    //
  }

  public unwatchMappingKeys(mappingId: number, keys: (number | BN | string)[]): void {
    //
  }

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

  private decodeEvent(event: EventLog): ContractEvent {
    let contractEvent: ContractEvent = {
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
          contractEvent.variables[definition.name] = <DecodedVariable>{
            name: definition.name,
            type: DefinitionUtils.typeClass(definition),
            value: event.returnValues[definition.name] // TODO: this should be a decoded value, it currently is a string always
          };
        }
      }
    }

    return contractEvent;
  }

  public async events(name: string | null = null, block: BlockType = "latest"): Promise<ContractEvent[]> {
    const web3Contract = new this.web3.eth.Contract(this.contract.abi, this.contractAddress);
    const events = await web3Contract.getPastEvents(name, {
      fromBlock: block,
      toBlock: block
    });

    let contractEvents: ContractEvent[] = [];

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
}
