import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { createInterfaceAdapter, TezosAdapter } from "@truffle/interface-adapter";
import { IContractStrategy } from "./IContractStrategy";
import { ContractInstance } from "../ContractInstance";
import { isTxParams } from "./utils";
import { PrepareCallSettings, TxParams } from "./types";
const Web3PromiEvent = require("web3-core-promievent");

export class TezosContractStrategy implements IContractStrategy {
  public readonly interfaceAdapter: TezosAdapter;
  public readonly defaults: { [key: string]: any };

  constructor(private _json: { [key: string]: any }, config: any) {
    this.interfaceAdapter = createInterfaceAdapter(config) as TezosAdapter;
    this.defaults = {}; // TODO BGC Populate defaults with config
    ["from"/*, "gas", "gasPrice"*/].forEach(key => {
      if (config[key]) {
        this.defaults[key] = config[key];
      }
    });
  }

  collectMethods(contractInstance: ContractAbstraction<ContractProvider>): { [key: string]: any; } {
    const methods: { [key: string]: any; } = {};
    for (const method in contractInstance.methods) {
      const sendTransaction = (...args: any) => {
        const [txArguments, _txParams] = this.prepareCall(args);

        return contractInstance.methods[method](txArguments).send();
      };

      methods[method] = Object.assign(
        sendTransaction,
        {
          sendTransaction,
          estimateGas: (txArgs: any[], txParams: { [key: string]: any }) => {
            return this.estimateGas(contractInstance, method, txArgs, txParams);
          },
          request: (txArgs: any[], _txParams: { [key: string]: any }) => {
            return contractInstance.methods[method](txArgs).toTransferParams({});
          }
        }
      );
    }
    return methods;
  }

  collectAdditionalProperties(contractInstance: ContractAbstraction<ContractProvider>): { [key: string]: any; } {
    return {
      storage: contractInstance.storage.bind(contractInstance),
      address: contractInstance.address
    };
  }

  deploy(txArgs: any[], txParams: TxParams): Promise<ContractInstance> {
    const promiEvent = Web3PromiEvent();

    const originateOp = this.originateParams(txArgs, txParams);

    this.interfaceAdapter.tezos.contract.originate(originateOp)
      .then((receipt) => {
        promiEvent.eventEmitter.emit("receipt", receipt);
        promiEvent.eventEmitter.emit("transactionHash", receipt.hash);
        return receipt.contract();
      })
      .then((contractInstance) => {
        promiEvent.resolve(new ContractInstance(this._json, this, contractInstance));
      })
      .catch(promiEvent.reject);

    return promiEvent.eventEmitter;
  }

  async at(address: string): Promise<ContractInstance> {
    if (
      address == null ||
      typeof address !== "string" ||
      address.length !== 36
    ) {
      throw new Error(`Invalid address passed to ${this._json.contractName}.at(): ${address}`);
    }

    const contractInstance = await this.interfaceAdapter.tezos.contract.at(address);
    return new ContractInstance(this._json, this, contractInstance);
  }

  prepareCall(args: any[], settings: PrepareCallSettings = {}): [any[], { [key: string]: any }] {
    // TODO BGC Possible validations
    // args.length <= 2, check if storage is valid, check if no storage is provided but needed, etc

    const last_arg = args.length ? args[args.length - 1] : null;
    const isLastArgParams = isTxParams(last_arg);

    const txParams = {
      ...this.defaults,
      ...(isLastArgParams ? last_arg : {})
    };

    let txArgs: any[];
    if (settings.isDeploy && isLastArgParams && args.length === 1 && this._json.initialStorage) {
      // Deploy only: No initialStorage passed, but there's a default initialStorage
      txArgs = [JSON.parse(this._json.initialStorage)];
    } else if (isLastArgParams) {
      // Last argument is txParams, everything else are txArgs
      txArgs = [...args.slice(0, args.length - 1)];
    } else {
      txArgs = args;
    }

    return [
      txArgs,
      txParams
    ];
  }

  private async estimateGas(contractInstance: ContractAbstraction<ContractProvider>, method: string, txArgs: any[], _txParams: { [key: string]: any }) {
    const transferOp = contractInstance.methods[method](txArgs).toTransferParams({});
    return this.interfaceAdapter.tezos.estimate.transfer(transferOp);
  }

  async estimateGasNew(txArgs: any[], txParams: { [key: string]: any }) {
    const originateOp = this.originateParams(txArgs, txParams);
    return this.interfaceAdapter.tezos.estimate.originate(originateOp);
  }

  private originateParams(txArgs: any[], txParams: { [key: string]: any }) {
    const michelson: any = JSON.parse(this._json.michelson);

    return {
      code: michelson,
      storage: txArgs[0],
      balance: txParams.value as string | "0",
      fee: txParams.fee,
      gasLimit: txParams.gas, // TODO BGC Should we use gasLimit instead?
      storageLimit: txParams.storageLimit
    };
  }
}