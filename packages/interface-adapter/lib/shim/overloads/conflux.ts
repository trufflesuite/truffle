import { Web3Shim } from "..";
import { Callback } from "web3/types";
import { Conflux } from "js-conflux-sdk";
import { TxHash, Transaction, TransactionReceipt } from "lib/adapter/types";

// We simply return plain ol' Web3.js
export const ConfluxDefinition = {
  async initNetworkType(web3: Web3Shim) {
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
  }
};

const overrides = {
  initCfx: (web3: Web3Shim, options?: any) => {
    const cfx = new Conflux({
      url: "http://localhost:12537"
      // @ts-ignore
      // logger: console
    });
    web3.cfx = cfx;
  },

  getBlockNumber: (web3: Web3Shim) => {
    const newMethod = function(cbk?: Callback<number>): Promise<number> {
      let _promise = web3.cfx.getEpochNumber("latest_state");
      return _promise;
    };
    web3.eth.getBlockNumber = newMethod;
  },

  getNetworkId: (web3: Web3Shim) => {
    const newMethod = function(cb?: Callback<number>): Promise<number> {
      return Promise.resolve(1592304361448); // fake id 4 is rinkerby id
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
      console.log("getBock block num: ", epochNum);
      if (epochNum == "latest") {
        epochNum = "latest_state";
      }
      // TODO map other tags
      // let blockInfo = await web3.cfx.getBlockByEpochNumber(epochNum);
      // blockInfo.number = blockInfo.epochNumber;
      return web3.cfx.getBlockByEpochNumber(epochNum);
    };
    web3.eth.getBlock = newMethod;
  },

  /**
   * main difference is 'blockNumber'
   */
  getTransaction: (web3: Web3Shim) => {
    const newMethod = function(tx: TxHash): Promise<Transaction> {
      let trans = web3.cfx.getTransactionByHash(tx);
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
    const newMethod = function(tx: TxHash): Promise<TransactionReceipt> {
      let transReceipt = web3.cfx.getTransactionReceipt();
      return transReceipt;
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
    const newMethod = function(address: string): Promise<string> {
      let code = web3.cfx.getCode(address);
      return code;
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
  }
};
