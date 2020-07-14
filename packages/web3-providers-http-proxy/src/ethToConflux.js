const { emptyFn, numToHex, deepClone, setNull, delKeys } = require("./util");
const debug = require("debug")("ethToConflux");
const { Account, Conflux } = require("js-conflux-sdk");

// TODO MAP latest_checkpoint
const EPOCH_MAP = {
  earliest: "earliest",
  latest: "latest_state",
  pending: "latest_state"
};
const DEFAULT_PASSWORD = "123456";

let cfx = undefined;
const accountAddresses = [];
const accounts = {};

function formatInput(params, coreParamIndex = 0, epochParamIndex = 1) {
  return function() {
    let ci = coreParamIndex;
    if (params[ci]) {
      // format tx gas and gasPrice
      if (params[ci].gas && Number.isInteger(params[ci].gas)) {
        params[ci].gas = numToHex(params[ci].gas);
      }
      if (params[ci].gasPrice && Number.isInteger(params[ci].gasPrice)) {
        params[ci].gasPrice = numToHex(params[ci].gasPrice);
      }
    }
    mapParamsTagAtIndex(params, epochParamIndex);
    return params;
  };
}

const bridge = {
  eth_blockNumber: {
    method: "cfx_epochNumber",
    input: function(params) {
      mapParamsTagAtIndex(params, 0);
      return params;
    }
  },
  eth_sendRawTransaction: {
    method: "cfx_sendRawTransaction"
  },
  eth_getBalance: {
    method: "cfx_getBalance",
    input: function(params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    }
  },
  eth_call: {
    method: "cfx_call",
    input: formatInput
  },

  eth_gasPrice: {
    method: "cfx_gasPrice"
  },

  eth_accounts: {
    method: "accounts",
    output: function(response) {
      if (accountAddresses && accountAddresses.length > 0) {
        response.result = Object.keys(accounts);
        response.error = null;
      }

      return response;
    }
  },

  eth_getTransactionCount: {
    method: "cfx_getNextNonce", // NOT right
    input: function(params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    }
  },
  eth_getCode: {
    method: "cfx_getCode",
    input: function(params) {
      mapParamsTagAtIndex(params, 1);
      return params;
    },
    output: function(response) {
      if (response && response.error && response.error.code == -32016) {
        response.error = null;
        response.result = "0x";
      }
      return response;
    }
  },
  eth_estimateGas: {
    method: "cfx_estimateGasAndCollateral",
    input: formatInput,
    output: function(response) {
      if (response && response.result && response.result.gasUsed) {
        response.result = response.result.gasUsed;
      }
      return response;
    }
  },
  eth_sendTransaction: {
    method: function(params) {
      if (params.length && accounts[params[0].from]) {
        return "cfx_sendRawTransaction";
      }
      return "cfx_sendTransaction";
    },

    input: async function(params) {
      if (params.length > 0) {
        const txInput = params[0];

        // simple handle txInput.to
        if (txInput.to) {
          txInput.to = "0x1" + txInput.to.slice(3);
        }
        if (txInput.data) {
          let len = txInput.data.length;
          len = (len - 6) % 32;
          if (len == 0) txInput.to = "0x8" + txInput.to.slice(3);
        }

        if (accounts[txInput.from]) {
          await formatTxInput.bind(cfx)(txInput);
          let signedTx = accounts[txInput.from].signTransaction(txInput);
          params[0] = "0x" + signedTx.encode(true).toString("hex");
        } else if (params.length == 1) {
          params.push(DEFAULT_PASSWORD);
        }
      }

      return params;
    }
  },

  eth_getStorageAt: {
    method: "cfx_getStorageAt",
    input: function(params) {
      mapParamsTagAtIndex(params, 2);
      return params;
    }
  },

  eth_getBlockByHash: {
    method: "cfx_getBlockByHash",
    output: function(response) {
      if (response.result) {
        formatBlock(response.result);
      }
      return response;
    }
  },

  eth_getBlockByNumber: {
    method: "cfx_getBlockByEpochNumber",
    input: function(params) {
      mapParamsTagAtIndex(params, 0);
      return params;
    },
    output: function(response) {
      if (response.result) {
        formatBlock(response.result);
      }
      return response;
    }
  },

  eth_getTransactionByHash: {
    method: "cfx_getTransactionByHash",
    output: function(response) {
      formatTx(response.result);
      return response;
    }
  },

  web3_clientVersion: {
    method: "cfx_clientVersion"
  },

  eth_chainId: {
    method: "cfx_getStatus",
    output: function(response) {
      if (response.result && response.result.chain_id) {
        response.result = response.result.chain_id;
      }
      return response;
    }
  },

  eth_getTransactionReceipt: {
    method: "cfx_getTransactionReceipt",
    output: function(response) {
      if (response && response.result) {
        txReceipt = response.result;
        txReceipt.contractAddress = txReceipt.contractCreated;
        txReceipt.blockNumber = txReceipt.epochNumber;
        txReceipt.transactionIndex = txReceipt.index;
        // txReceipt.status = txReceipt.outcomeStatus === 0 ? 1 : 0; // conflux和以太坊状态相反
        txReceipt.status = txReceipt.outcomeStatus === "0x0" ? "0x1" : "0x0"; // conflux和以太坊状态相反
        txReceipt.cumulativeGasUsed = txReceipt.gasUsed; // TODO simple set
        // txReceipt.gasUsed = `0x${txReceipt.gasUsed.toString(16)}`;
        delKeys(txReceipt, [
          "contractCreated",
          "epochNumber",
          "gasFee",
          "index",
          "outcomeStatus",
          "stateRoot"
        ]);
      }
      return response;
    }
  },
  eth_getLogs: {
    method: "cfx_getLogs",
    input: function(params) {
      if (params.length > 0) {
        let fromBlock = params[0].fromBlock;
        let toBlock = params[0].toBlock;
        params[0].fromEpoch = mapTag(fromBlock);
        params[0].toEpoch = mapTag(toBlock);
      }
      return params;
    }
  },

  eth_sign: {
    method: "sign",
    input: function(params) {
      let newParams = [params[1], params[0], DEFAULT_PASSWORD];
      return newParams;
    }
  }
};

bridge["net_version"] = bridge.eth_chainId;

function ethToConflux(options) {
  // it's better to use class
  setHost(options.url || `http://${options.host}:${options.port}`);
  setAccounts(options.privateKeys);

  return async function(payload) {
    // clone new one to avoid change old payload
    const newPayload = deepClone(payload);
    // eslint-disable-next-line no-unused-vars
    const oldMethod = newPayload.method;
    const handler = bridge[newPayload.method];

    if (!handler) {
      debug(`Mapping "${oldMethod}" to nothing`);
      return {
        adaptedOutputFn: emptyFn,
        adaptedPayload: newPayload
      };
    }

    let inputFn = handler.input || emptyFn;
    newPayload.method =
      (typeof handler.method == "function" &&
        handler.method(newPayload.params)) ||
      handler.method;
    newPayload.params = await inputFn(newPayload.params);
    debug(`Mapping "${oldMethod}" to "${newPayload.method}"`);
    return {
      adaptedOutputFn: handler.output || emptyFn,
      adaptedPayload: newPayload
    };
  };
}

module.exports = ethToConflux;

// helper methods===============================================
function formatTx(tx) {
  // blockNumber?   TODO maybe cause big problem
  tx.input = tx.data;
  delKeys(tx, [
    "chainId",
    "contractCreated",
    "data",
    "epochHeight",
    "status",
    "storageLimit"
  ]);
  setNull(tx, ["blockNumber"]);
  return tx;
}

function formatBlock(block) {
  block.number = block.epochNumber;
  // sha3Uncles?
  // logsBloom?
  block.stateRoot = block.deferredStateRoot;
  block.receiptsRoot = block.deferredReceiptsRoot;
  // totalDifficulty?
  // extraData?
  // gasUsed?
  block.uncles = block.refereeHashes; // check?
  // format tx object
  if (
    block.tranactions &&
    block.tranactions.length > 0 &&
    typeof block.tranactions[0] === "object"
  ) {
    for (let tx of block.tranactions) {
      formatTx(tx);
    }
  }
  delKeys(block, [
    "adaptive",
    "blame",
    "deferredLogsBloomHash",
    "deferredReceiptsRoot",
    "deferredStateRoot",
    "epochNumber",
    "height",
    "powQuality",
    "refereeHashes"
  ]);
  setNull(block, [
    "extraData",
    "gasUsed",
    "logsBloom",
    "mixHash",
    "sha3Uncles",
    "totalDifficulty"
  ]);
  return block;
}

async function formatTxInput(options) {
  // debug("this of formatTxInput:", this);
  if (options.nonce === undefined) {
    options.nonce = await this.getNextNonce(options.from);
  }

  if (options.gasPrice === undefined) {
    options.gasPrice = this.defaultGasPrice;
  }
  if (options.gasPrice === undefined) {
    options.gasPrice = (await this.getGasPrice()) || 1; // MIN_GAS_PRICE
  }

  if (options.gas === undefined) {
    options.gas = this.defaultGas;
  }

  if (options.storageLimit === undefined) {
    options.storageLimit = this.defaultStorageLimit;
  }

  if (options.gas === undefined || options.storageLimit === undefined) {
    const {
      gasUsed,
      storageCollateralized
    } = await this.estimateGasAndCollateral(options);

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
}

function mapTag(tag) {
  return EPOCH_MAP[tag] || tag;
}

function mapParamsTagAtIndex(params, index) {
  if (params[index]) {
    params[index] = mapTag(params[index]);
  }
}

function setAccounts(privateKeys) {
  if (!privateKeys) return;

  if (typeof privateKeys == "string") {
    privateKeys = [privateKeys];
  }

  privateKeys
    .map(key => {
      let account = new Account(key);
      accountAddresses.push(account.toString());
      return account;
    })
    .map(account => (accounts[account.toString()] = account));
}

function setHost(host) {
  // debug("set host:", host);
  cfx = new Conflux({
    url: host
  });
}
