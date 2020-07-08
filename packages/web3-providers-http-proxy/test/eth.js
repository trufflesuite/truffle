const EthProvider = require("web3-providers-http");
const {
  genRPCPayload,
  BlockKeys,
  TxKeys,
  DefalutValue,
  ReceiptKeys
} = require("./");
const URL = "http://127.0.0.1:7545";
// eslint-disable-next-line no-unused-vars
const should = require("chai").should();
const {
  bytecode: MigrateByteCode,
  last_completed_migration_data: CallData
} = require("./contract.json");

let ethProvider = new EthProvider(URL);

function promiseSend(payload) {
  return new Promise(function(resolve, reject) {
    ethProvider.send(payload, function(err, response) {
      if (err || response.error) {
        console.error(response.error);
        reject(err || response.error);
      } else {
        resolve(response.result);
      }
    });
  });
}

async function getAccounts() {
  let payload = genRPCPayload("eth_accounts");
  return await promiseSend(payload);
}

/*
  Notice: run this test on ganache node
  The test contract is truffle migration
*/

describe("ETH", function() {
  let accounts;
  let contractAddress; // "0xf888d08c3d1b296286ea5a8f9f24054bb6a057c8"

  before(async function() {
    accounts = await getAccounts();

    // deploy contract and set contract address
    let txInfo = {
      from: accounts[0],
      data: MigrateByteCode, // a simple coin contract bytecode
      gas: "0x100000"
    };
    let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
    let txHash = await promiseSend(payload);
    payload = genRPCPayload("eth_getTransactionReceipt", [txHash]);
    let receipt = await promiseSend(payload);
    contractAddress = receipt.contractAddress;
  });

  describe("#eth_blockNumber", function() {
    it("should return hex block number", async function() {
      let payload = genRPCPayload("eth_blockNumber");
      let blockNumber = await promiseSend(payload);
      blockNumber.should.be.a("string");
    });
  });

  describe("#eth_accounts", function() {
    it("should return a public address array", async function() {
      let payload = genRPCPayload("eth_accounts");
      let receivedAccounts = await promiseSend(payload);
      receivedAccounts.should.be.a("array");
    });
  });

  describe("#eth_getBalance", function() {
    it("should get balance in hex format", async function() {
      let payload = genRPCPayload("eth_getBalance", [accounts[0]]);
      let balance = await promiseSend(payload);
      balance.should.be.a("string");
    });

    it("should get balance with block tag parameter", async function() {
      let payload = genRPCPayload("eth_getBalance", [accounts[0], "latest"]);
      let balance = await promiseSend(payload);
      balance.should.be.a("string");
    });
  });

  describe("#eth_getBlockByNumber", function() {
    it("should getBlockByNumber", async function() {
      let payload = genRPCPayload("eth_blockNumber");
      let number = await promiseSend(payload);
      payload = genRPCPayload("eth_getBlockByNumber", [number, false]);
      let block = await promiseSend(payload);
      block.should.be.a("object");
      block.should.have.keys(BlockKeys);
    });
  });

  describe("#eth_gasPrice", function() {
    it("eth_gasPrice", async function() {
      let payload = genRPCPayload("eth_gasPrice");
      let price = await promiseSend(payload);
      price.should.be.a("string");
    });
  });

  describe("#eth_getTransactionCount", function() {
    it("should get TransactionCount", async function() {
      let payload = genRPCPayload("eth_getTransactionCount", [
        accounts[0],
        "latest"
      ]);
      let nonce = await promiseSend(payload);
      nonce.should.be.a("string");
    });
  });

  describe("#eth_getBlockByHash", function() {
    it("get block by hash", async function() {
      let payload = genRPCPayload("eth_getBlockByNumber", ["latest", false]);
      let block = await promiseSend(payload);
      payload = genRPCPayload("eth_getBlockByHash", [block.hash, true]);
      block = await promiseSend(payload);
      block.should.be.a("object");
    });
  });

  describe("#eth_sendRawTransaction", function() {
    it("sendRawTx", async function() {
      // TODO
    });
  });

  describe("#eth_estimateGas", function() {
    it("estimateGas", async function() {
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: DefalutValue
      };
      let payload = genRPCPayload("eth_estimateGas", [txInfo]);
      let estimate = await promiseSend(payload);
      estimate.should.be.a("string");
    });
  });

  describe("#eth_sendTransaction", function() {
    it("should send simple tx", async function() {
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: DefalutValue
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
    });

    it("should send tx with nonce", async function() {
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: DefalutValue
      };
      let payload = genRPCPayload("eth_getTransactionCount", [
        accounts[0],
        "latest"
      ]);
      let nonce = await promiseSend(payload);
      txInfo.nonce = nonce;
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
    });

    it("should deploy an contract", async function() {
      let txInfo = {
        from: accounts[0],
        value: "0x0",
        data: MigrateByteCode
      };
      let payload = genRPCPayload("eth_estimateGas", [txInfo]);
      let estimate = await promiseSend(payload);
      txInfo.gas = estimate;
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
    });

    it("should send with gas and gasPrice", async function() {
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: DefalutValue
      };
      // gas
      let payload = genRPCPayload("eth_estimateGas", [txInfo]);
      let estimate = await promiseSend(payload);
      txInfo.gas = estimate;
      // gas price
      payload = genRPCPayload("eth_gasPrice");
      let price = await promiseSend(payload);
      txInfo.gasPrice = price;
      // send tx
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
    });
  });

  describe("#eth_getTransactionByHash", function() {
    it("get transaction by hash", async function() {
      let txInfo = {
        from: accounts[1],
        to: accounts[0],
        value: DefalutValue
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      payload = genRPCPayload("eth_getTransactionByHash", [txHash]);
      let tx = await promiseSend(payload);
      tx.should.be.a("object");
      tx.should.have.keys(TxKeys);
    });
  });

  describe("#eth_call", function() {
    it("eth_call", async function() {
      let payload = genRPCPayload("eth_call", [
        {
          data: CallData,
          to: contractAddress
        },
        "latest"
      ]);
      let result = await promiseSend(payload);
      result.should.be.a("string");
    });
  });

  describe("#eth_getCode", function() {
    it("getCode", async function() {
      let payload = genRPCPayload("eth_getCode", [contractAddress, "latest"]);
      let code = await promiseSend(payload);
      code.should.be.a("string");
    });
  });

  describe("#eth_getStorageAt", function() {
    it("getStorageAt", async function() {
      let payload = genRPCPayload("eth_getStorageAt", [
        contractAddress,
        "0x0",
        "latest"
      ]);
      let storage = await promiseSend(payload);
      storage.should.be.a("string");
    });
  });

  describe("#eth_getTransactionReceipt", function() {
    it("should get tx receipt", async function() {
      let txInfo = {
        from: accounts[0],
        data: MigrateByteCode, // a simple coin contract bytecode
        gas: "0x100000"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
      payload = genRPCPayload("eth_getTransactionReceipt", [txHash]);
      let receipt = await promiseSend(payload);
      receipt.should.have.keys(ReceiptKeys);
      receipt.should.have.property("status", "0x1");
    });
  });

  describe("#eth_getLogs", function() {
    it("should get logs", async function() {
      let payload = genRPCPayload("eth_getLogs", [
        {
          address: contractAddress
        }
      ]);
      let logs = await promiseSend(payload);
      logs.should.be.a("array");
    });
  });
});
