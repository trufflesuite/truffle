import AsyncEventEmitter from "async-eventemitter";
import Web3 from "web3";
import { TruffleContractInstance } from "truffle-contract";
import BN from "bn.js";

type BlockReference = number | "latest";

interface EvmMapping {
  name: string;
  type: string;
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

export default class TruffleDecoder extends AsyncEventEmitter {
  private web3: Web3;

  constructor(contract: TruffleContractInstance, inheritedContracts: TruffleContractInstance[], provider: string) {
    super();

    if (provider.startsWith("http://") || provider.startsWith("https://")) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(provider));
    }
    else if (provider.startsWith("ws://")) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(provider));
    }

    // slot allocation!
  }

  public async state(block: BlockReference = "latest"): Promise<ContractState | undefined> {
    return undefined;
  }

  public async variable(name: string, block: BlockReference = "latest"): Promise<DecodedVariable | undefined> {
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