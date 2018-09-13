import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject, Ast } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { AstDefinition } from "../types/ast";
import { EvmInfo } from "../types/evm";
import * as references from "../allocate/references";
import { StoragePointer } from "../types/pointer";
import decode from "../decode";
import { Definition as DefinitionUtils, EVM, Allocation } from "truffle-decode-utils";
import { BlockType } from "web3/eth/types";
import { EventLog } from "web3/types";

export interface ContractStateVariable {
  isChildVariable: boolean;
  definition: AstDefinition;
  pointer?: StoragePointer;
}

export interface EvmVariableReferenceMapping {
  [nodeId: number]: ContractStateVariable
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

type EvmVariable = BN | string | EvmMapping | EvmStruct;

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
    if (contractNode.nodeType === "ContractDefinition" && contractNode.name === contract.contractName) {
      return contractNode;
    }
  }

  return undefined;
}

function getContractNodeId(contract: ContractObject): number {
  const node = getContractNode(contract);
  return node ? node.id : 0;
}

export default class TruffleContractDecoder extends AsyncEventEmitter {
  private web3: Web3;

  private contract: ContractObject;
  private contractNetwork: string;
  private contractAddress: string;
  private inheritedContracts: ContractObject[];

  private contracts: ContractMapping = {};

  private referenceDeclarations: AstReferences;

  private eventDefinitions: AstReferences;
  private eventDefinitionIdsByName: {
    [name: string]: number
  };

  private stateVariableReferences: EvmVariableReferenceMapping;

  constructor(contract: ContractObject, inheritedContracts: ContractObject[], provider: string) {
    super();

    if (provider.startsWith("http:\/\/") || provider.startsWith("https:\/\/")) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(provider));
    }
    else if (provider.startsWith("ws:\/\/")) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(provider));
    }

    this.contract = contract; //cloneDeep(contract);
    this.inheritedContracts = inheritedContracts; //cloneDeep(inheritedContracts);

    this.contractNetwork = Object.keys(this.contract.networks)[0];
    this.contractAddress = this.contract.networks[this.contractNetwork].address;

    this.contracts[getContractNodeId(this.contract)] = this.contract;
    this.inheritedContracts.forEach((inheritedContract) => {
      this.contracts[getContractNodeId(inheritedContract)] = inheritedContract;
    });
  }

  public async init(): Promise<void> {
    this.referenceDeclarations = references.getReferenceDeclarations([this.contract, ...this.inheritedContracts]);

    this.eventDefinitions = references.getEventDefinitions([this.contract, ...this.inheritedContracts]);
    const ids = Object.keys(this.eventDefinitions);
    this.eventDefinitionIdsByName = {};
    for (let i = 0; i < ids.length; i++) {
      const id = parseInt(ids[i]);
      this.eventDefinitionIdsByName[this.eventDefinitions[id].name] = id;
    }

    this.stateVariableReferences = references.getContractStateVariables(this.contract, this.contracts, this.referenceDeclarations);
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

      if (!variable.isChildVariable) {
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

        const val = await decode(variable.definition, variable.pointer, info, this.web3, this.contractAddress);

        result.variables[variable.definition.name] = <DecodedVariable>{
          name: variable.definition.name,
          type: DefinitionUtils.typeClass(variable.definition),
          value: val
        };
      }
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
  
        if (!variable.isChildVariable) {
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
    }

    return result;
  }

  public watchMappingKeys(mappingId: number, keys: (number | BN | string)[]): void {
    //
  }

  public unwatchMappingKeys(mappingId: number, keys: (number | BN | string)[]): void {
    //
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