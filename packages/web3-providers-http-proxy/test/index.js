function createRpcReq(payload) {
  payload.id = Date.now();
  payload.jsonrpc = "2.0";
  return payload;
}

function genRPCPayload(method, params = []) {
  return {
    id: Date.now(),
    jsonrpc: "2.0",
    method,
    params
  };
}

const BlockKeys = [
  "number",
  "hash",
  "parentHash",
  "mixHash",
  "nonce",
  "sha3Uncles",
  "logsBloom",
  "transactionsRoot",
  "stateRoot",
  "receiptsRoot",
  "miner",
  "difficulty",
  "totalDifficulty",
  "extraData",
  "size",
  "gasLimit",
  "gasUsed",
  "timestamp",
  "transactions",
  "uncles"
];

const TxKeys = [
  "hash",
  "nonce",
  "blockHash",
  "blockNumber",
  "transactionIndex",
  "from",
  "to",
  "value",
  "gas",
  "gasPrice",
  "input",
  "v",
  "r",
  "s"
];

const ReceiptKeys = [
  "transactionHash",
  "transactionIndex",
  "blockHash",
  "blockNumber",
  "from",
  "to",
  "gasUsed",
  "cumulativeGasUsed",
  "contractAddress",
  "logs",
  "status",
  "logsBloom"
];

const LogKeys = [
  "logIndex",
  "blockNumber",
  "blockHash",
  "transactionHash",
  "transactionIndex",
  "address",
  "data",
  "topics"
];

async function wait(second = 10) {
  await new Promise(function(resolve) {
    setTimeout(resolve, second * 1000);
  });
}

module.exports = {
  createRpcReq,
  genRPCPayload,
  BlockKeys,
  TxKeys,
  DefalutValue: "0x100",
  ReceiptKeys,
  LogKeys,
  wait
};
