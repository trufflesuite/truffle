import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { TruffleContractInstance } from "./truffle-contract";
import BN from "bn.js";
import { AstDefinition } from "../types/ast";
import cloneDeep from "lodash.clonedeep";
import getVariableReferences from "../allocate/references";

type BlockReference = number | "latest";

export interface EvmVariableReferenceMapping {
  [id: string]: AstDefinition
}

interface EvmMapping {
  name: string;
  type: string;
  id: string; // UUID that helps request for more key-value pairs
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

export default class TruffleContractDecoder extends AsyncEventEmitter {
  private web3: Web3;

  private contract: TruffleContractInstance;
  private inheritedContracts: TruffleContractInstance[];

  private stateVariableReferences: EvmVariableReferenceMapping;

  constructor(contract: TruffleContractInstance, inheritedContracts: TruffleContractInstance[], provider: string) {
    super();

    if (provider.startsWith("http://") || provider.startsWith("https://")) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(provider));
    }
    else if (provider.startsWith("ws://")) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(provider));
    }

    this.contract = cloneDeep(contract);
    this.inheritedContracts = cloneDeep(inheritedContracts);
  }

  public async init(): Promise<void> {
    this.variableReferences = await getVariableReferences(this.contract, this.inheritedContracts);
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