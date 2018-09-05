import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { ContractObject, Ast } from "truffle-contract-schema/spec";
import BN from "bn.js";
import { AstDefinition } from "../types/ast";
import { EvmInfo } from "../types/evm";
import cloneDeep from "lodash.clonedeep";
import * as references from "../allocate/references";
import { StoragePointer } from "../types/pointer";
import decode from "../decode";

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
  private contractNetwork: string;
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

    this.contract = contract; //cloneDeep(contract);
    this.inheritedContracts = inheritedContracts; //cloneDeep(inheritedContracts);

    this.contractNetwork = Object.keys(this.contract.networks)[0];

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
    const contractAddress = this.contract.networks[this.contractNetwork].address;

    let result: ContractState = {
      name: this.contract.contractName,
      balance: new BN(await this.web3.eth.getBalance(contractAddress)),
      variables: []
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
        mappingKeys: {}
      };

      const val = await decode(variable.definition, variable.pointer, info, this.web3, contractAddress);
      console.log(val);
    }

    return result;
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