import { JsonRPCRequest, JsonRPCResponse, Provider, Callback } from "web3/providers";

const crypto = require("crypto");

export interface AxCoreDeployOptions {
  param1: string;
  param2: string;
};

function isContractDeploy(payload: JsonRPCRequest) {
  return payload.params.length > 0 && payload.params[0].to == null;
}

interface IndexedOptions {
  [key: string]: AxCoreDeployOptions
};

export default class AxCorePayloadExtension {
  private provider: Provider;
  private transactionOptions: IndexedOptions;
  private predeployOptions: IndexedOptions;
  private contractOptions: IndexedOptions;
  private deployingContracts: { [key: string]: string };

  constructor(provider: Provider) {
    this.provider = provider;

    this.transactionOptions = {};
    this.predeployOptions = {}; // indexed by hashed bytecode
    this.contractOptions = {}; // indexed by address
    this.deployingContracts = {};
  }

  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any {
    if (payload.method === "eth_getTransactionReceipt" && typeof this.transactionOptions[payload.params[0]] !== "undefined") {
      // add payload extensions
      const txHash = payload.params[0];
      payload.params.push(this.transactionOptions[txHash].param1);
      payload.params.push(this.transactionOptions[txHash].param2);
    }

    this.provider.send(payload, (...args: any[]) => {
      if (payload.method === "eth_sendTransaction" || payload.method === "eth_sendRawTransaction") {
        const txHash = args[1].result;
        if (isContractDeploy(payload)) {
          const bytecode = payload.params[0].data;
          const bytecodeHash = crypto.createHash("md5").update(bytecode).digest("hex");

          if (this.predeployOptions[bytecodeHash]) {
            this.deployingContracts[txHash] = bytecodeHash;
            this.transactionOptions[txHash] = this.predeployOptions[bytecodeHash];
          }
        }
        else {
          this.transactionOptions[txHash] = 
        }
      }

      if (payload.method === "eth_getTransactionReceipt") {
        const txHash = args[1].result.transactionHash;
        const to = args[1].result.to;
        if (this.deployingContracts[txHash]) {
          const bytecodeHash = this.deployingContracts[txHash];
          const options = this.predeployOptions[bytecodeHash];
          this.contractOptions[to] = options;
          delete this.predeployOptions[bytecodeHash];
          console.log ("INSTALLED");
        }
      }

      callback.apply(null, args);
    })
  }

  registerNewContract(bytecode: string, options: AxCoreDeployOptions) {
    const bytecodeHash = crypto.createHash("md5").update(bytecode).digest("hex");

    this.predeployOptions[bytecodeHash] = options;
  }
};


