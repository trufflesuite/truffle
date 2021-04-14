import { IContractStrategy } from "./contract-strategies/IContractStrategy";
import { TezosContractStrategy } from "./contract-strategies/TezosContractStrategy";
import { ContractInstance } from "./ContractInstance";

export class ContractConstructor {
  private readonly strategy: IContractStrategy;
  private readonly network_id: string;

  public new: {
    (...args: any[]): void;
    estimateGas: (txArgs: any[]) => void;
  };

  constructor(private _json: { [key: string]: any }, config: any) {
    this._json.gasMultiplier = this._json.gasMultiplier || 1.25;
    this.network_id = config.network_id;

    switch(this._json.architecture) {
      case "tezos":
        this.strategy = new TezosContractStrategy(_json, config);
        break;
      default:
        throw Error(`Architecture ${this._json.architecture} not supported for contract`);
    }

    const deployNewContract = (...args: any[]): Promise<ContractInstance> => {
      const [txArguments, txParams] = this.strategy.prepareCall(args, { isDeploy: true });
  
      return this.strategy.deploy(txArguments, txParams);
    };

    this.new = Object.assign(
      deployNewContract,
      {
        estimateGas: (...txArgs: any[]) => {
          return this.strategy.estimateGasNew(txArgs, {});
        }
      }
    );
  }

  public at(address: string): Promise<ContractInstance> {
    return this.strategy.at(address);
  }

  public deployed(): Promise<ContractInstance> {
    return this.strategy.at(this.address);
  }

  public isDeployed(): boolean {
    return false;
  }

  public get contract_name(): string {
    return this._json.contractName;
  }

  public get contractName(): string {
    return this._json.contractName;
  }

  public get address(): string {
    return this.network.address;
  }

  public set address(val: string) {
    if (!val) {
      throw new Error(`Cannot set deployed address; malformed value: ${val}`);
    }

    // TODO BGC Probably not needed if we enforce setting network_id on creation
    if (!this.network_id) {
      throw new Error(`${this.contractName} has no network id set, cannot lookup artifact data.`);
    }

    // Create a network if we don't have one.
    if (this._json.networks[this.network_id] == null) {
      this._json.networks[this.network_id] = {
        events: {},
        links: {}
      };
    }

    this.network.address = val;
  }

  public get transactionHash(): string {
    return this.network.transactionHash;
  }

  public set transactionHash(val: string) {
    this.network.transactionHash = val;
  }

  private get network(): any {
    // TODO BGC Probably not needed if we enforce setting network_id on creation
    if (!this.network_id) {
      throw new Error(`${this.contractName} has no network id set, cannot lookup artifact data.`);
    }

    if (!this._json.networks[this.network_id]) {
      var error =
        this.contractName +
        " has no network configuration" +
        " for its current network id (" +
        this.network_id +
        ").";

      throw new Error(error);
    }

    // TODO BGC Cannot be left like this, needs to be set beforehand and only on setters
    const currentNetwork = this._json.networks[this.network_id];

    if (!currentNetwork.links) {
      currentNetwork.links = {};
    }

    if (!currentNetwork.events) {
      currentNetwork.events = {};
    }

    return currentNetwork;
  }

  // TODO BGC Hack for deployment.js contract.interfaceAdapter.getBlock call
  public get interfaceAdapter() {
    return this.strategy.interfaceAdapter;
  }

  public defaults() {
    return this.strategy.defaults;
  }

  public setProvider() {
    return;
  }

  public async detectNetwork() {
    return Promise.resolve();
  }

  public toJSON() {
    return this._json;
  }
}