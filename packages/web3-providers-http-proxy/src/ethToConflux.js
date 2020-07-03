const emptyFn = require("./util").emptyFn;

// TO MAP latest_checkpoint
const tagMapper = {
  earliest: "earliest",
  latest: "latest_state",
  pending: "latest_state"
};

function formatInput(params) {
  // 1. add nonce parameter to tx object
  // TODO
  // 2. block number tag map
  if (Array.isArray(params)) {
    if (params.length == 2) {
      let toMap = tagMapper[params[1]];
      if (toMap) {
        params[1] = toMap;
      }
      if (params[0] && params[0].gas && Number.isInteger(params[0].gas)) {
        params[0].gas = `0x${params[0].gas.toString(16)}`;
      }
      if (
        params[0] &&
        params[0].gasPrice &&
        Number.isInteger(params[0].gasPrice)
      ) {
        params[0].gasPrice = `0x${params[0].gasPrice.toString(16)}`;
      }
    }
  }
  return params;
}

const bridge = {
  eth_blockNumber: {
    method: "cfx_epochNumber",
  },
  eth_getBlockByNumber: {
    method: "cfx_getBlockByEpochNumber",
    input: function (params) {
      if (params.length > 0) {
        params[0] = tagMapper[params[0]] || params[0];
      }
    },
  },
  eth_call: {
    method: "cfx_call",
    input: formatInput,
  },
  eth_getCode: {
    method: "cfx_getCode",
    input: formatInput,
    output: function (response) {
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
    output: function (response) {
      if (response && response.result && response.result.gasUsed) {
        response.result = response.result.gasUsed;
      }
      return response;
    }
  },
  eth_sendTransaction: {
    method: "send_transaction",
    // todo: set storagelimit and gas
    input: function (params) {
      if (params.length > 0) {
        params[0].gasPrice = params.gasPrice || "0x" + 1e9.toString(16);
        params[0].gas = params.gas || "0x1000000";
        params[0].storageLimit = params.storageLimit || "0x1000000";
        // simple handle
        params[0].to = "0x1" + params[0].to.slice(3);
        if (params[0].data) {
          let len = params[0].data.length;
          len = (len - 6) % 32;
          if (len == 0)
            params[0].to[2] = "0x8" + params[0].to.slice(3);
        }
      }
      if (params.length == 1) {
        params.push("123456");
      }
      return params;
    }
  }
};

function ethToConflux(payload) {
  const oldMethod = payload.method;
  const handler = bridge[payload.method];
  console.log(`Mapping "${oldMethod}" to "${handler && handler.method}"`);
  if (!handler) {
    return emptyFn;
  }

  let inputFn = handler.input || emptyFn;
  payload.params = inputFn(payload.params);
  payload.method = handler.method;
  console.log("cfx payload:", payload);
  return handler.output || emptyFn;
}

module.exports = ethToConflux;
