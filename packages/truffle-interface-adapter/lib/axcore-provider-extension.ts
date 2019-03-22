import { JsonRPCRequest, JsonRPCResponse, Provider, Callback } from "web3/providers";

const crypto = require("crypto");

export interface AxCoreDeployOptions {
  param1: string;
  param2: string;
};

function isContractDeploy(payload: JsonRPCRequest) {
  return payload.params.length > 0 &&
    typeof payload.params[0] === "object" &&
    payload.params[0].from &&
    payload.params[0].to == null;
}

interface IndexedOptions {
  [BytecodeHash: string]: AxCoreDeployOptions;
};

interface IndexedBytecodeHashes {
  [TransactionHash: string]: string;
};

interface IndexedBytecodes {
  [FunctionSignatureHash: string]: string[];
};

export default class AxCorePayloadExtension {
  private provider: Provider;
  private transactionOptions: IndexedOptions;
  private predeployOptions: IndexedOptions;
  private deployingContracts: IndexedBytecodeHashes;
  private contractOptions: IndexedOptions;
  private constructorBytecodes: IndexedBytecodes;

  constructor(provider: Provider) {
    this.provider = provider;

    this.transactionOptions = {};
    this.predeployOptions = {}; // indexed by hashed bytecode
    this.deployingContracts = {}; // indexed by tx hash
    this.contractOptions = {}; // indexed by address
    this.constructorBytecodes = {}; // indexed by constructor signature hash
  }

  getBytecodeHashForTxData(data: string): string | null {
    const functionSignatureHash = data.slice(2, 10);

    if (this.constructorBytecodes[functionSignatureHash]) {
      const bytecodes = this.constructorBytecodes[functionSignatureHash];
      for (let i = 0; i < bytecodes.length; i++) {
        if (data.startsWith(bytecodes[i])) {
          const bytecodeHash: string = crypto.createHash("md5").update(bytecodes[i]).digest("hex");
          return bytecodeHash;
        }
      }
    }

    return null;
  }

  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any {
    if (payload.method === "eth_getTransactionReceipt") {
      if (typeof this.transactionOptions[payload.params[0]] !== "undefined") {
        // add payload extensions
        const txHash: string = payload.params[0];
        payload.params.push(this.transactionOptions[txHash].param1);
        payload.params.push(this.transactionOptions[txHash].param2);
      }
    }
    else if (payload.params.length > 0) {
      if (payload.params[0].to && this.contractOptions[payload.params[0].to]) {
        const contractAddress: string = payload.params[0].to;
        Object.assign(payload.params[0], this.contractOptions[contractAddress]);
      }
      else if (isContractDeploy(payload)) {
        const bytecode: string = payload.params[0].data;
        const bytecodeHash = this.getBytecodeHashForTxData(bytecode);

        if (this.predeployOptions[bytecodeHash]) {
          Object.assign(payload.params[0], this.predeployOptions[bytecodeHash]);
        }
      }
    }

    this.provider.send(payload, (...args: any[]) => {
      if (args.length > 1 && args[1].result) {
        if (payload.method === "eth_sendTransaction" || payload.method === "eth_sendRawTransaction") {
          const txHash: string = args[1].result;
          if (isContractDeploy(payload)) {
            const bytecode: string = payload.params[0].data;
            const bytecodeHash = this.getBytecodeHashForTxData(bytecode);

            if (this.predeployOptions[bytecodeHash]) {
              this.deployingContracts[txHash] = bytecodeHash;
              this.transactionOptions[txHash] = this.predeployOptions[bytecodeHash];
              delete this.constructorBytecodes[bytecode.slice(2, 10)];
            }
          }
          else if (payload.params.length > 0 && payload.params[0].param1 && payload.params[0].param2) {
            this.transactionOptions[txHash] = {
              param1: payload.params[0].param1,
              param2: payload.params[0].param2
            };
          }
        }

        if (payload.method === "eth_getTransactionReceipt") {
          const txHash: string = args[1].result.transactionHash;
          const to: string = args[1].result.contractAddress;
          if (this.deployingContracts[txHash]) {
            const bytecodeHash = this.deployingContracts[txHash];
            const options = this.predeployOptions[bytecodeHash];
            this.contractOptions[to] = options;
            delete this.predeployOptions[bytecodeHash];
          }
          delete this.transactionOptions[txHash];
        }
      }

      callback.apply(null, args);
    })
  }

  registerNewContract(bytecode: string, options: AxCoreDeployOptions): string | null {
    if (typeof options !== "object" || typeof options.param1 === "undefined" || typeof options.param2 === "undefined") {
      return `The "axcore" network type requires an options parameter to deployer.deploy(__CONTRACTNAME__, options, ...args) and __CONTRACTNAME__.new(options, ...args)\n` +
      `The "options" field should look like this: {\n` +
      `  param1: "param1-value",\n` +
      `  param2: "param2-value"\n` +
      `}\n` +
      `The options object with both params was not provided while migrating __CONTRACTNAME__\n` +
      `Read more datails in the documentation here:\n` +
      `https://truffleframework.com/docs/truffle/distributed-ledger-support/working-with-axcore\n`;
    }

    const bytecodeHash: string = crypto.createHash("md5").update(bytecode).digest("hex");

    const functionSignatureHash = bytecode.slice(2, 10);

    if (this.constructorBytecodes[functionSignatureHash]) {
      this.constructorBytecodes[functionSignatureHash].push(bytecode);
    }
    else {
      this.constructorBytecodes[functionSignatureHash] = [ bytecode ];
    }

    this.predeployOptions[bytecodeHash] = {
      param1: options.param1,
      param2: options.param2
    };

    return null;
  }
};


