import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject, Ast } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { EvmInfo } from "../types/evm";
import * as general from "../allocate/general";
import * as storage from "../allocate/storage";
import { StoragePointer } from "../types/pointer";
import decode from "../decode";
import { Definition as DefinitionUtils, EVM, Allocation, AstDefinition } from "truffle-decode-utils";
import { BlockType, Transaction } from "web3/eth/types";
import { EventLog, Log } from "web3/types";
import { Provider } from "web3/providers";
import abiDecoder from "abi-decoder";

//holds a collection of storage allocations for structs and contracts, indexed
//by the ID of the struct or contract
export interface StorageAllocations {
  [id: number]: StorageAllocation
}

//an individual storage allocation for (the members of) a struct or (the state
//variables of) a contract
export interface StorageAllocation {
  definition: AstDefinition;
  size?: storage.StorageLength; //only used for structs
  members: StorageMemberAllocations;
}

//a collection of the individual storage references for (the members of) a
//struct or (the state variables of) a contract, indexed by the ID of the
//member or state variable
export interface StorageMemberAllocations {
  [id: number]: StorageMemberAllocation
}

//an individual storage reference for a member of a struct or a state variable
//of a contract
export interface StorageMemberAllocation {
  definition: AstDefinition;
  pointer: StoragePointer;
}

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

export interface AstReferences {
  [nodeId: number]: AstDefinition;
};

export interface ContractMapping {
  [nodeId: number]: ContractObject;
};

export function getContractNode(contract: ContractObject): Ast {
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

  private stateVariableReferences: StorageAllocation;

  constructor(contract: ContractObject, inheritedContracts: ContractObject[], provider: Provider) {
    super();

    this.web3 = new Web3(provider);

    this.contract = contract; //cloneDeep(contract);
    this.inheritedContracts = inheritedContracts; //cloneDeep(inheritedContracts);

    this.contractNetwork = Object.keys(this.contract.networks)[0];
    this.contractAddress = this.contract.networks[this.contractNetwork].address;

    this.contractNode = getContractNode(this.contract);

    this.contracts[this.contractNode.id] = this.contract;
    abiDecoder.addABI(this.contract.abi);
    this.inheritedContracts.forEach((inheritedContract) => {
      let node: AstDefinition = getContractNode(inheritedContract);
      this.contracts[node.id] = inheritedContract;
      this.contractNodes[node.id] = node;
      abiDecoder.addABI(inheritedContract.abi);
    });
  }

  public async init(): Promise<void> {
    this.referenceDeclarations = general.getReferenceDeclarations([this.contractNode, ...this.contractNodes]);

    this.eventDefinitions = general.getEventDefinitions([this.contract, ...this.inheritedContracts]);
    const ids = Object.keys(this.eventDefinitions);
    this.eventDefinitionIdsByName = {};
    for (let idString of ids) {
      const id = parseInt(idString);
      this.eventDefinitionIdsByName[this.eventDefinitions[id].name] = id;
    }

    this.storageAllocations = storage.getStorageAllocations(this.referenceDeclarations, {this.contractNode.id: this.contractNode});
    this.stateVariableReferences = this.storageAllocations[this.contractNode.id].members;
  }

  public async state(block: BlockType = "latest"): Promise<ContractState | undefined> {
    let result: ContractState = {
      name: this.contract.contractName,
      balance: new BN(await this.web3.eth.getBalance(this.contractAddress)),
      variables: {}
    };

    const nodeIds = Object.keys(this.stateVariableReferences);

    for(let i = 0; i < nodeIds.length; i++) {
      const variable = this.stateVariableReferences[parseInt(nodeIds[i])];

      const info: EvmInfo = {
        scopes: {},
        state: {
          stack: [],
          storage: {},
          memory: new Uint8Array(0)
        },
        mappingKeys: {},
        referenceDeclarations: this.referenceDeclarations,
        referenceVariables: this.referenceVariables,
        variables: this.stateVariableReferences
      };

      const val = await decode(variable.definition, variable.pointer, info, this.web3, this.contractAddress);

      result.variables[variable.definition.name] = <DecodedVariable>{
        name: variable.definition.name,
        type: DefinitionUtils.typeClass(variable.definition),
        value: val
      };
    }

    return result;
  }

  public async variable(name: string, block: BlockType = "latest"): Promise<DecodedVariable | undefined> {
    return undefined;
  }

  public async mapping(mappingId: number, keys: (number | BN | string)[]): Promise<EvmVariable[] | undefined> {
    const contractAddress = this.contract.networks[this.contractNetwork].address;
    const mappingReference = this.stateVariableReferences[mappingId];
    const definition = mappingReference.definition.typeName.valueType;

    let result: EvmVariable[] = [];

    for (let i = 0; i < keys.length; i++) {
      let state = <references.ContractStateInfo>{
        variables: {},
        slot: {
          offset: new BN(0),
          index: EVM.WORD_SIZE - 1
        }
      };

      const path: Allocation.Slot = {
        key: keys[i],
        path: mappingReference.pointer.storage.from.slot,
        offset: new BN(0)
      };

      references.allocateDefinition(definition, state, this.referenceDeclarations, path);

      const nodeIds = Object.keys(state.variables);
  
      for(let i = 0; i < nodeIds.length; i++) {
        const variable = state.variables[parseInt(nodeIds[i])];
  
        const info: EvmInfo = {
          scopes: {},
          state: {
            stack: [],
            storage: {},
            memory: new Uint8Array(0)
          },
          mappingKeys: {},
          referenceDeclarations: this.referenceDeclarations,
          variables: this.stateVariableReferences
        };

        const val = await decode(variable.definition, variable.pointer, info, this.web3, contractAddress);

        result.push(val);
      }
    }

    return result;
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
