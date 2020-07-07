const EthProvider = require("web3-providers-http");
const { MigrateByteCode, genRPCPayload, BlockKeys, TxKeys } = require("./");
const URL = "http://127.0.0.1:7545";
const promisify = require("util").promisify;
// eslint-disable-next-line no-unused-vars
const should = require("chai").should();

// Notice: run this test on ganache node

describe("Eth", function() {
  let promiseSend;
  let getAccounts;
  let accounts;

  before(async function() {
    let ethProvider = new EthProvider(URL);
    promiseSend = promisify(function(payload, callback) {
      ethProvider.send(payload, function(err, response) {
        if (err || response.error) {
          callback(err || response.error);
        } else {
          callback(null, response.result);
        }
      });
    });
    getAccounts = async function() {
      let payload = genRPCPayload("eth_accounts");
      return await promiseSend(payload);
    };
    accounts = await getAccounts();
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
      let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
      let nonce = await promiseSend(payload);
      nonce.should.be.a("string");
    });
  });

  describe("#eth_getBlockByHash", function() {
    it("get block by hash", async function() {
      let payload = genRPCPayload("eth_blockNumber");
      let number = await promiseSend(payload);
      payload = genRPCPayload("eth_getBlockByNumber", [number, false]);
      let block = await promiseSend(payload);
      payload = genRPCPayload("eth_getBlockByHash", [block.hash, true]);
      block = await promiseSend(payload);
      block.should.be.a("object");
    });
  });

  describe("#eth_getTransactionByHash", function() {
    it("get transaction by hash", async function() {
      let txInfo = {
        from: accounts[1],
        to: accounts[0],
        value: "0x100"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      payload = genRPCPayload("eth_getTransactionByHash", [txHash]);
      let tx = await promiseSend(payload);
      tx.should.be.a("object");
      tx.should.have.keys(TxKeys);
    });
  });

  describe("#eth_sendRawTransaction", function() {
    it("sendRawTx", async function() {
      // TODO
    });
  });

  describe("#eth_call", function() {
    it("eth_call", async function() {
      // TODO
    });
  });

  describe("#eth_getCode", function() {
    it("getCode", async function() {
      let txInfo = {
        from: accounts[0],
        data: MigrateByteCode, // a simple coin contract bytecode
        gas: "0x100000"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
      // TODO get contract address from tx receipt
      // TODO get code
    });
  });

  describe("#eth_estimateGas", function() {
    it("estimateGas", async function() {
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: "0x100"
      };
      let payload = genRPCPayload("eth_estimateGas", [txInfo]);
      let estimate = await promiseSend(payload);
      estimate.should.be.a("string");
    });
  });

  describe("#eth_sendTransaction", function() {
    it("sendTx", async function() {
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: "0x100"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
    });
  });

  describe("#eth_getStorageAt", function() {
    it("get transaction by hash", async function() {
      // TODO
    });
  });
});
