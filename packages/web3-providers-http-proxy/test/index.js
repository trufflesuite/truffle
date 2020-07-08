const Web3 = require("web3");
const Contract = require("web3-eth-contract");

const web3 = new Web3();
// eslint-disable-next-line no-unused-vars
const { HttpProvider, ethToConflux } = require("../src");
const URL = "http://localhost:7545";
// const URL = "http://localhost:12539"
const provider = new HttpProvider(URL, {
  // chainAdaptor: ethToConflux
});
web3.setProvider(provider);

const contractAddress = "0xf888d08C3D1b296286eA5A8F9F24054bb6a057C8";
const account = "0x18b3aF791E23A5e7AcE86DB8Cd97c2879116d9c3";

// eslint-disable-next-line no-unused-vars
async function testProvider() {
  // test get block number
  // let number = await web3.eth.getBlockNumber();
  // console.log("current number", number);

  // set provider for all later instances to use
  Contract.setProvider(provider);
  let contract = new Contract(require("./contract.json").abi, contractAddress);

  await contract.methods.setCompleted(3).send({
    from: account
  });

  let result = await contract.methods.last_completed_migration().call();
  console.log("result", result);
}

// testProvider();

// helper method
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

module.exports = {
  createRpcReq,
  genRPCPayload,
  BlockKeys,
  TxKeys,
  DefalutValue: "0x100"
};
