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
    input: emptyFn,
    output: emptyFn
  },
  eth_call: {
    method: "cfx_call",
    input: formatInput,
    output: emptyFn
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
  }
};

function ethToConflux(payload) {
  const oldMethod = payload.method;
  const handler = bridge[payload.method];
  if (!handler) {
    return emptyFn;
  }
  console.log(`Mapping "${oldMethod}" to "${handler.method}"`);
  payload.method = handler.method;
  payload.params = handler.input(payload.params);
  return handler.output;
}

module.exports = ethToConflux;
