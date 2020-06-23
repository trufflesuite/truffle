import { Web3Shim } from "..";
import PromiEvent from "web3/promiEvent";
import { Callback, TransactionReceipt as web3TxReceipt } from "web3/types";
import { TxHash, Transaction, TransactionReceipt } from "lib/adapter/types";
import { Tx as web3Tx } from "web3/eth/types";
import { EventEmitter } from "events";
import Eth from "web3/eth";
import {
  // Conflux,
  TransactionReceipt as cfxTxReceipt,
  Transaction as cfxTx,
  TransactionConfig
} from "js-conflux-sdk";
import { Conflux } from "/Users/pana/Projects/conflux/js-conflux-sdk";

// We simply return plain ol' Web3.js
export const ConfluxDefinition = {
  async initNetworkType(web3: Web3Shim) {
    // console.log("init network by conflux type");
    overrides.initCfx(web3);
    overrides.getBlockNumber(web3);
    overrides.getNetworkId(web3);
    overrides.getAccounts(web3);
    overrides.getBlock(web3);
    overrides.getTransaction(web3);
    overrides.getTransactionReceipt(web3);
    overrides.getBalance(web3);
    overrides.getCode(web3);
    overrides.estimateGas(web3);
    overrides.sendTransaction(web3);
  }
};

const overrides = {
  initCfx: (web3: Web3Shim, options?: any) => {
    // save cfx object
    const cfx = new Conflux({
      // @ts-ignore
      url: web3.currentProvider.host // TODO get network config from web3 object
      // @ts-ignore
      // logger: console
    });
    web3.cfx = cfx;
  },

  getBlockNumber: (web3: Web3Shim) => {
    const newMethod = function(cbk?: Callback<number>): Promise<number> {
      let _promise = web3.cfx.getEpochNumber("latest_state"); // TODO hardcode
      return _promise;
    };
    web3.eth.getBlockNumber = newMethod;
  },

  getNetworkId: (web3: Web3Shim) => {
    const newMethod = function(cb?: Callback<number>): Promise<number> {
      return Promise.resolve(1592304361448); // TODO hardcode
    };
    web3.eth.net.getId = newMethod;
  },

  getAccounts: (web3: Web3Shim) => {
    const newMethod = function(cb?: Callback<string[]>): Promise<string[]> {
      return web3.cfx.provider.call("accounts");
    };
    web3.eth.getAccounts = newMethod;
  },

  /**
   * epochNumber -> number
   * mixHash?
   * nonce?
   * sha3Uncles?
   * logsBloom?
   * deferredStateRoot -> stateRoot
   * deferredReceiptsRoot -> receiptsRoot
   * totalDifficulty?
   * extraData?
   * gasUsed?
   * uncles?
   *
   * 1. 字段的映射
   * 3. 字段的缺失?
   */
  getBlock: (web3: Web3Shim) => {
    const newMethod = async function(epochNum: any): Promise<any> {
      if (epochNum == "latest") {
        epochNum = "latest_state";
      }
      // TODO map other tags
      let blockInfo = await web3.cfx.getBlockByEpochNumber(epochNum);
      blockInfo.number = blockInfo.epochNumber;
      return Promise.resolve(blockInfo);
    };
    web3.eth.getBlock = newMethod;
  },

  /**
   * main difference is 'blockNumber'
   */
  getTransaction: (web3: Web3Shim) => {
    const newMethod = async function(tx: TxHash): Promise<Transaction> {
      let trans = await web3.cfx.getTransactionByHash(tx);
      // @ts-ignore
      trans.blockNumber = trans.epochHeight;
      return trans;
    };
    web3.eth.getTransaction = newMethod;
  },

  /**
   * index -> transactionIndex
   * blockNumber?
   * cumulativeGasUsed?
   * contractAddress? contractCreated
   * outcomeStatus -> status
   */
  getTransactionReceipt: (web3: Web3Shim) => {
    const newMethod = async function(tx: TxHash): Promise<TransactionReceipt> {
      let txReceipt = await web3.cfx.getTransactionReceipt(tx);
      if (txReceipt) {
        // @ts-ignore
        txReceipt.contractAddress = txReceipt.contractCreated;
        // @ts-ignore
        txReceipt.blockNumber = txReceipt.epochNumber;
        // @ts-ignore
        txReceipt.transactionIndex = txReceipt.index;
        // @ts-ignore
        txReceipt.status = txReceipt.outcomeStatus === 0 ? 1 : 0; // conflux和以太坊状态相反
        txReceipt.gasUsed = `0x${txReceipt.gasUsed.toString(16)}`;
      }
      return Promise.resolve(txReceipt);
    };
    web3.eth.getTransactionReceipt = newMethod;
  },

  getBalance: (web3: Web3Shim) => {
    const newMethod = async function(address: string): Promise<string> {
      let balance = await web3.cfx.getBalance(address, "latest_state");
      return balance.toString();
    };
    web3.eth.getBalance = newMethod;
  },

  getCode: (web3: Web3Shim) => {
    const newMethod = async function(address: string): Promise<string> {
      try {
        let code = await web3.cfx.getCode(address);
        return code;
      } catch {
        return "0x";
      }
    };
    web3.eth.getCode = newMethod;
  },

  estimateGas: (web3: Web3Shim) => {
    const newMethod = async function(txConfig: Transaction): Promise<number> {
      let result = await web3.cfx.estimateGasAndCollateral(txConfig);
      // @ts-ignore
      return Promise.resolve(result.gasUsed);
    };
    web3.eth.estimateGas = newMethod;
  },

  sendTransaction: (web3: Web3Shim) => {
    // @ts-ignore
    let newMethod = function(
      tx: web3Tx,
      cb?: Callback<string>
      // @ts-ignore
    ): cfxPromiEvent<web3TxReceipt> {
      console.trace("\n-----------sendTransaction");
      let cfxTx: any = {};
      cfxTx.from = tx.from;
      cfxTx.to = tx.to;
      cfxTx.value = tx.value || "0x0";
      cfxTx.data = tx.data;
      // @ts-ignore
      cfxTx.gas = tx.gas;
      // @ts-ignore
      cfxTx.gasPrice = tx.gasPrice;
      // @ts-ignore
      let password = "123456";

      // cfxTx = {
      //   from: "0x12be576f8eb81046c6f29f1801f39b75390fd760",
      //   to: "0x1A655f04d03f522e34f22e976A30294F4C83dEAd",
      //   value: "0x100",
      // }
      console.log("send transaction:", cfxTx);
      let txhashP = web3.cfx.sendTransaction(cfxTx, password);

      const promiEvent = new cfxPromiEvent(txhashP, web3);
      // promiEvent.start(txhashP)

      return promiEvent;
    };
    web3.eth.sendTransaction = newMethod;
  }
};

export class cfxPromiEvent implements PromiEvent<web3TxReceipt> {
  emiter: EventEmitter;
  eth: Eth;

  receipt: web3TxReceipt;
  err: Error;
  public constructor(txhashPromise: Promise<string>, web3: Web3Shim) {
    this.emiter = new EventEmitter();
    this.eth = web3.eth;

    this.start(txhashPromise);
    // .then(console.log)
  }

  async start(txhashP: Promise<string>) {
    try {
      console.log("start cfx promise event", txhashP);

      const txhash = await txhashP;
      console.log("get txhash done.", txhash);

      //use async due to emit is synchronize action. and truffle will get stuck for unkown reasons.
      (async function() {
        this.emiter.emit("transactionHash", txhash);
      })();

      // wait packed
      console.log("wait be packed");
      const loopForTxRpt = setInterval(async () => {
        try {
          console.log("get transaction receipt");
          const rpt: any = await this.eth.getTransactionReceipt(txhash);

          //@ts-ignore
          if (rpt) {
            this.receipt = rpt;
            clearInterval(loopForTxRpt);
            this.emiter.emit("receipt", this.receipt);
            this.emiter.emit(
              "confirmation",
              this.receipt.blockNumber,
              this.receipt
            );
          }
        } catch (e) {
          this.err = e;
          this.emiter.emit("error", e);
        }
      }, 1000);
    } catch (err) {
      throw err;
    }
    // setInterval(() => console.log("."), 1000)
  }

  once(
    type: "transactionHash",
    handler: (receipt: string) => void
  ): PromiEvent<web3TxReceipt>;
  once(
    type: "receipt",
    handler: (receipt: web3TxReceipt) => void
  ): PromiEvent<web3TxReceipt>;
  once(
    type: "confirmation",
    handler: (confNumber: number, receipt: web3TxReceipt) => void
  ): PromiEvent<web3TxReceipt>;
  once(
    type: "error",
    handler: (error: Error) => void
  ): PromiEvent<web3TxReceipt>;
  once(
    type: import("web3/promiEvent").PromiEventType,
    handler: (error: string | web3TxReceipt | Error) => void
  ): PromiEvent<web3TxReceipt>;

  public once(type: any, handler: any): PromiEvent<web3TxReceipt> {
    this.emiter.once(type, handler);
    return this;
  }

  on(
    type: "transactionHash",
    handler: (receipt: string) => void
  ): PromiEvent<web3TxReceipt>;
  on(
    type: "receipt",
    handler: (receipt: web3TxReceipt) => void
  ): PromiEvent<web3TxReceipt>;
  on(
    type: "confirmation",
    handler: (confNumber: number, receipt: web3TxReceipt) => void
  ): PromiEvent<web3TxReceipt>;
  on(type: "error", handler: (error: Error) => void): PromiEvent<web3TxReceipt>;
  on(
    type: import("web3/promiEvent").PromiEventType,
    handler: (error: string | web3TxReceipt | Error) => void
  ): PromiEvent<web3TxReceipt>;
  public on(type: any, handler: any): PromiEvent<web3TxReceipt> {
    this.emiter.on(type, handler);
    return this;
  }

  public then<TResult1 = web3TxReceipt, TResult2 = never>(
    onfulfilled?: (value: web3TxReceipt) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
  ): Promise<TResult1 | TResult2> {
    return new Promise((resolve, reject) => {
      console.log("execute then of cfxPromiEvent promise");
      if (this.receipt) {
        onfulfilled(this.receipt);
        // @ts-ignore
        return resolve(this.receipt);
      }

      if (this.err) {
        if (onrejected) onrejected(this.err);
        return reject(this.err);
      }
      this.emiter.on("receipt", rpt => {
        onfulfilled(rpt);
        // @ts-ignore
        resolve(this.receipt);
      });
      this.emiter.on("error", err => {
        if (onrejected) onrejected(err);
        reject(err);
      });
    });
  }

  public catch<TResult = never>(
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<web3TxReceipt | TResult> {
    return new Promise((resolve, reject) => {
      console.log("execute catch of cfxPromiEvent promise");
      if (this.err) {
        if (onrejected) onrejected(this.err);
        // @ts-ignore
        return reject(this.err);
      }

      this.emiter.on("error", err => {
        if (onrejected) onrejected(err);
        reject(err);
      });
    });
  }

  [Symbol.toStringTag]: string;

  public finally(onfinally?: () => void): Promise<web3TxReceipt> {
    return new Promise((resolve, reject) => {
      console.log("execute then of cfxPromiEvent promise");
      if (this.receipt) {
        if (onfinally) onfinally();
        // @ts-ignore
        return resolve(this.receipt);
      }
      if (this.err) {
        if (onfinally) onfinally();
        return reject(this.err);
      }
      this.emiter.on("receipt", rpt => {
        if (onfinally) onfinally();
        // @ts-ignore
        resolve(this.receipt);
      });
      this.emiter.on("error", err => {
        if (onfinally) onfinally();
        reject(err);
      });
    });
  }
}
