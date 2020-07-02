import { Web3Shim } from "..";
// @ts-ignore
import PromiEventImpl from "web3-core-promievent"
import { TxHash, Transaction, TransactionReceipt } from "lib/adapter/types";
import { Tx as web3Tx } from "web3/eth/types";
// @ts-ignore
import { Conflux } from "js-conflux-sdk";
// @ts-ignore
import format from "js-conflux-sdk/src/util/format";

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

var cfx: Conflux

const overrides = {
  initCfx: (web3: Web3Shim) => {
    // save cfx object
    cfx = new Conflux({
      // @ts-ignore
      url: web3.currentProvider.host // TODO get network config from web3 object
      // @ts-ignore
      // logger: console
    });
    // @ts-ignore
    web3.cfx = cfx;
  },

  getBlockNumber: (web3: Web3Shim) => {
    const newMethod = function (): Promise<number> {
      let _promise = cfx.getEpochNumber("latest_state"); // TODO hardcode
      return _promise;
    };
    web3.eth.getBlockNumber = newMethod;
  },

  getNetworkId: (web3: Web3Shim) => {
    const newMethod = function (): Promise<number> {
      return Promise.resolve(1592304361448); // TODO hardcode
    };
    web3.eth.net.getId = newMethod;
  },

  getAccounts: (web3: Web3Shim) => {
    const newMethod = function (): Promise<string[]> {
      return cfx.provider.call("accounts");
    };
    web3.eth.getAccounts = newMethod;
    cfx.getAccounts = newMethod;
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
    const newMethod = async function (epochNum: any): Promise<any> {
      if (epochNum == "latest") {
        epochNum = "latest_state";
      }
      // TODO map other tags
      let blockInfo = await cfx.getBlockByEpochNumber(epochNum);
      blockInfo.number = blockInfo.epochNumber;
      return Promise.resolve(blockInfo);
    };
    web3.eth.getBlock = newMethod;
  },

  /**
   * main difference is 'blockNumber'
   */
  getTransaction: (web3: Web3Shim) => {
    const newMethod = async function (tx: TxHash): Promise<Transaction> {
      let trans = await cfx.getTransactionByHash(tx);
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
    const newMethod = async function (tx: TxHash): Promise<TransactionReceipt> {
      let txReceipt = await cfx.getTransactionReceipt(tx);
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
    const newMethod = async function (address: string): Promise<string> {
      let balance = await cfx.getBalance(address, "latest_state");
      return balance.toString();
    };
    web3.eth.getBalance = newMethod;
  },

  getCode: (web3: Web3Shim) => {
    const newMethod = async function (address: string): Promise<string> {
      try {
        let code = await cfx.getCode(address);
        return code;
      } catch {
        return "0x";
      }
    };
    web3.eth.getCode = newMethod;
  },

  estimateGas: (web3: Web3Shim) => {
    const newMethod = async function (txConfig: Transaction): Promise<number> {
      let result = await cfx.estimateGasAndCollateral(txConfig);
      // @ts-ignore
      return Promise.resolve(result.gasUsed);
    };
    web3.eth.estimateGas = newMethod;
  },

  sendTransaction: (web3: Web3Shim) => {
    // @ts-ignore
    let newMethod = function (
      tx: web3Tx      // @ts-ignore
    ) {
      // console.trace("\n-----------sendTransaction");
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

      let promiEvent = createCfxPromiEvent(web3, cfxTx, password);
      return promiEvent.eventEmitter;
    };

    web3.eth.sendTransaction = newMethod;
  }
};

function createCfxPromiEvent(web3: Web3Shim, tx: any, password: string) {
  let promiEvent = PromiEventImpl(false);

  let fireError = function (err: string, _promiEvent: any) {
    console.trace(`cfx promise event err:${err}`);
    _promiEvent.eventEmitter.emit("error", err)
    if (_promiEvent.reject) {
      _promiEvent.reject(err);
    }
  };


  let start = async function (_promiEvent: any) {
    try {
      // console.log("\tstart cfx promise event");
      let txhash = await cfxSendTransaction.call(cfx, tx, password);
      // console.log("\tget txhash done.", txhash);

      //use async due to emit is synchronize action. and truffle will get stuck for unkown reasons.
      (async function () {
        _promiEvent.eventEmitter.emit("transactionHash", txhash);
      })();

      // wait packed
      // console.log("\twait be packed");
      const loopForTxRpt = setInterval(async () => {
        try {
          // console.log("\nget transaction receipt");
          const receipt: any = await web3.eth.getTransactionReceipt(txhash);

          //@ts-ignore
          if (receipt) {
            // console.log(`\ttx is packed, get receipt ${receipt}`);
            clearInterval(loopForTxRpt);
            _promiEvent.eventEmitter.emit("receipt", receipt);
            _promiEvent.eventEmitter.emit("confirmation", receipt.blockNumber, receipt);
            _promiEvent.resolve(receipt);
          }
        } catch (e) {
          fireError(e, _promiEvent);
        }
      }, 1000);
    } catch (err) {
      fireError(err, _promiEvent);
    }
  };
  start(promiEvent);
  return promiEvent;
}



async function cfxSendTransaction(options: any, password: string) {
  if (options.nonce === undefined) {
    options.nonce = await this.getNextNonce(options.from);
  }

  if (options.gasPrice === undefined) {
    options.gasPrice = this.defaultGasPrice;
  }
  if (options.gasPrice === undefined) {
    options.gasPrice = await this.getGasPrice() || 1; // MIN_GAS_PRICE
  }

  if (options.gas === undefined) {
    options.gas = this.defaultGas;
  }

  if (options.storageLimit === undefined) {
    options.storageLimit = this.defaultStorageLimit;
  }

  if (options.gas === undefined || options.storageLimit === undefined) {
    const { gasUsed, storageCollateralized } = await this.estimateGasAndCollateral(options);

    if (options.gas === undefined) {
      options.gas = gasUsed;
    }

    if (options.storageLimit === undefined) {
      options.storageLimit = storageCollateralized;
    }
  }

  if (options.epochHeight === undefined) {
    options.epochHeight = await this.getEpochNumber();
  }

  if (options.chainId === undefined) {
    options.chainId = this.defaultChainId;
  }
  if (options.chainId === undefined) {
    const status = await this.getStatus();
    options.chainId = status.chainId;
  }

  const fmtOption = format.sendTx(options)
  fmtOption.epochHeight = "0x" + fmtOption.epochHeight.toString(16)
  fmtOption.chainId = "0x" + fmtOption.chainId.toString(16)
  return this.provider.call('send_transaction', fmtOption, password);
}