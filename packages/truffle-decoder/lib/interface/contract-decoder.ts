import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject, Ast } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { AstDefinition } from "../types/ast";
import cloneDeep from "lodash.clonedeep";
import * as references from "../allocate/references";
import { StoragePointer } from "../types/pointer";

type BlockReference = number | "latest";

export interface ContractStateVariable {
  definition: AstDefinition;
  pointer?: StoragePointer;
}

export interface EvmVariableReferenceMapping {
  [nodeId: number]: ContractStateVariable
}

interface EvmMapping {
  name: string;
  type: string;
  id: number;
  keyType: string;
  valueType: string;
  members: {
    [key: string]: EvmVariable;
  };
};

interface EvmStruct {
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
  variables: DecodedVariable[];
};

interface ContractEvent {
  // TODO:
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
  private inheritedContracts: ContractObject[];

  private contracts: ContractMapping = {};

  private referenceDeclarations: AstReferences;

  private stateVariableReferences: EvmVariableReferenceMapping;

  constructor(contract: ContractObject, inheritedContracts: ContractObject[], provider: string) {
    super();

    if (provider.startsWith("http://") || provider.startsWith("https://")) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(provider));
    }
    else if (provider.startsWith("ws://")) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(provider));
    }

    this.contract = cloneDeep(contract);
    this.inheritedContracts = cloneDeep(inheritedContracts);

    this.contracts[getContractNodeId(this.contract)] = this.contract;
    this.inheritedContracts.forEach((inheritedContract) => {
      this.contracts[getContractNodeId(inheritedContract)] = inheritedContract;
    });
  }

  public async init(): Promise<void> {
    this.referenceDeclarations = references.getReferenceDeclarations([this.contract, ...this.inheritedContracts]);
    this.stateVariableReferences = references.getContractStateVariables(this.contract, this.contracts, this.referenceDeclarations);
  }

  public async state(block: BlockReference = "latest"): Promise<ContractState | undefined> {
    return undefined;
  }

  public async variable(name: string, block: BlockReference = "latest"): Promise<DecodedVariable | undefined> {
    return undefined;
  }

  public async mapping(mappingId: number, key: number | BN | string): Promise<EvmVariable | undefined> {
    return undefined;
  }

  public async events(name: string | null = null, block: BlockReference = "latest"): Promise<ContractEvent[]> {
    return [];
  }

  public onEvent(name: string, callback: Function): void {
    //this.web3.eth.subscribe(name);
  }

  public removeEventListener(name: string): void {
  }
}