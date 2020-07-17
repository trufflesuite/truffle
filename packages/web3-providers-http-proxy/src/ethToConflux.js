const { emptyFn, numToHex, deepClone, setNull, delKeys } = require("./util");
const debug = require("debug")("ethToConflux");
const { Account, Conflux, util } = require("js-conflux-sdk");

// TODO MAP latest_checkpoint
const EPOCH_MAP = {
  earliest: "earliest",
  latest: "latest_state",
  pending: "latest_state"
};
const DEFAULT_PASSWORD = "123456";

let cfx = undefined;
const checksumAddress = util.sign.checksumAddress;
const accountAddresses = [];
const accounts = {};

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
    input: formatInput()
  },

  eth_gasPrice: {
    method: "cfx_gasPrice"
  },

  eth_accounts: {
    method: "accounts",
    output: function(response) {
      if (response && accountAddresses && accountAddresses.length > 0) {
        response.result = accountAddresses;
        response.error = null;
      } else if (response && response.result) {
        response.result = response.result.map(checksumAddress);
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
    input: formatInput(),
    output: function(response) {
      if (response && response.result && response.result.gasUsed) {
        response.result = response.result.gasUsed;
      }
      return response;
    }
  },

  eth_sendTransaction: {
    method: function(params) {
      if (params.length && getAccount(params[0].from)) {
        return "cfx_sendRawTransaction";
      }
      return "cfx_sendTransaction";
    },

    input: async function(params) {
      if (params.length > 0) {
        const txInput = params[0];
        const from = getAccount(txInput.from);

        params[0] = await formatTxInput.bind(cfx)(txInput);
        debug("formated inputTx:", params[0]);
        if (from) {
          let signedTx = from.signTransaction(params[0]);
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
      if (response && response.result) {
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
      if (response && response.result) {
        formatBlock(response.result);
      }
      return response;
    }
  },

  eth_getTransactionByHash: {
    method: "cfx_getTransactionByHash",
    output: function(response) {
      if (response && response.result) formatTx(response.result);
      return response;
    }
  },

  web3_clientVersion: {
    method: "cfx_clientVersion"
  },

  eth_chainId: {
    method: "cfx_getStatus",
    output: function(response) {
      debug("convert cfx_getStatus response:", response);
      if (response && response.result && response.result.chainId) {
        response.result = Number.parseInt(response.result.chainId);
      }
      return response;
    }
  },

  net_version: {
    method: "cfx_getStatus",
    output: function(response) {
      debug("convert cfx_getStatus response:", response);
      if (response && response.result && response.result.chainId) {
        response.result = Number.parseInt(response.result.chainId) + 10000;
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
        // console.log("txReceipt.outcomeStatus",Number.parseInt(txReceipt.outcomeStatus));
        txReceipt.status = Number.parseInt(txReceipt.outcomeStatus)
          ? "0x0"
          : "0x1"; // conflux和以太坊状态相反
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
    // input: function (params) {
    //   let newParams = [params[1], params[0], DEFAULT_PASSWORD];
    //   return newParams;
    // },
    send: function(orignSend, payload, callback) {
      // console.trace("execute sign send ", payload, "callback:", callback.toString());
      payload = deepClone(payload);
      const address = payload.params[0];
      const message = payload.params[1];
      const account = getAccount(address);
      // console.log("get account done", account);

      if (account) {
        // console.log("start sign by local");
        // let signed;
        const isAddressMatched =
          message.from && message.from.toLowerCase() == address;
        let signed = isAddressMatched
          ? account.signTransaction(message)
          : account.signMessage(message);

        const response = {
          jsonrpc: payload.jsonrpc,
          result: signed,
          id: payload.id
        };
        // console.log("sign callback ", response);
        callback(null, response);
      } else {
        // console.log("start sign by rpc");
        let newParams = [message, address, DEFAULT_PASSWORD];
        payload.method = "sign";
        payload.params = newParams;
        // debug("sign orign send ", payload);
        orignSend(payload, callback);
      }
      // console.log("sign adapt send done");
    }
  }
};
function ethToConflux(options) {
  // it's better to use class
  setHost(options.url || `http://${options.host}:${options.port}`);
  setAccounts(options.privateKeys);

  adaptor = async function(payload) {
    // clone new one to avoid change old payload
    const oldPayload = payload;
    payload = deepClone(payload);
    // eslint-disable-next-line no-unused-vars
    const handler = bridge[payload.method];

    debug(`Mapping "${oldPayload.method}" to ${handler && handler.method}`);
    if (!handler) {
      return {
        adaptedOutputFn: emptyFn,
        adaptedPayload: payload
      };
    }

    if (handler.send) {
      return {
        adaptedSend: handler.send
      };
    }

    let inputFn = handler.input || emptyFn;
    payload.method =
      (typeof handler.method == "function" && handler.method(payload.params)) ||
      handler.method;
    payload.params = await inputFn(payload.params);
    debug("Mapping", oldPayload, "to", payload);

    return {
      adaptedOutputFn: handler.output || emptyFn,
      adaptedPayload: payload
    };
  };
  adaptor.accounts = accounts;
  return adaptor;
}

module.exports = ethToConflux;

// helper methods===============================================

function formatInput(txRelatedParamIndex = 0, epochParamIndex = 1) {
  return function(params) {
    let ti = txRelatedParamIndex;
    if (params[ti]) {
      // format tx gas and gasPrice
      if (params[ti].gas && Number.isInteger(params[ti].gas)) {
        params[ti].gas = numToHex(params[ti].gas);
      }
      if (params[ti].gasPrice && Number.isInteger(params[ti].gasPrice)) {
        params[ti].gasPrice = numToHex(params[ti].gasPrice);
      }
      if (params[ti].from) params[ti].from = checksumAddress(params[ti].from);
      if (params[ti].to) params[ti].to = checksumAddress(params[ti].to);
    }
    mapParamsTagAtIndex(params, epochParamIndex);
    return params;
  };
}

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
  // simple handle to
  // if (options.to) {
  //   options.to = "0x1" + options.to.slice(3);
  // }
  // if (options.data) {
  //   let len = options.data.length;
  //   len = (len - 6) % 32;
  //   if (len == 0) options.to = "0x8" + options.to.slice(3);
  // }
  if (options.value === undefined) {
    options.value = "0x0";
  }

  if (options.nonce === undefined) {
    options.nonce = await this.getNextNonce(options.from);
  }

  if (options.gasPrice === undefined) {
    options.gasPrice = this.defaultGasPrice;
  }
  if (options.gasPrice === undefined) {
    const recommendGas = Number.parseInt(await this.getGasPrice());
    options.gasPrice = numToHex(recommendGas || 1); // MIN_GAS_PRICE
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

  const forCfxSendTransaction = !getAccount(options.from);
  if (forCfxSendTransaction) {
    options = util.format.sendTx(options);
  }
  return options;
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

  privateKeys.forEach(key => {
    const account = new Account(key);
    const checksumed = checksumAddress(account.address);
    if (accountAddresses.indexOf(checksumed) < 0) {
      accountAddresses.push(checksumed);
      accounts[account.address] = account;
    }
  });
}

function getAccount(address) {
  return accounts[address.toLowerCase(address)];
}

function setHost(host) {
  // debug("set host:", host);
  cfx = new Conflux({
    url: host
  });
}
