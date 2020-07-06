const { HttpProvider, ethToConflux } = require("../src/");
const { genRPCPayload, BlockKeys, TxKeys, DefalutValue } = require("./");
const URL = "http://127.0.0.1:12537";
const promisify = require("util").promisify;
// eslint-disable-next-line no-unused-vars
const should = require("chai").should();
const {
  bytecode: MigrateByteCode,
  last_completed_migration_data: CallData
} = require("./contract.json");

// Notice: multi sendTransaction from same account, maybe will have nonce issue

describe("Cfx", function() {
  let promiseSend;
  let getAccounts;
  let accounts;
  let contractAddress = "";

  before(async function() {
    let ethProvider = new HttpProvider(URL, {
      chainAdaptor: ethToConflux
    });
    //
    promiseSend = promisify(function(payload, callback) {
      ethProvider.send(payload, function(err, response) {
        if (err || response.error) {
          console.error(response.error);
          callback(err || response.error);
        } else {
          callback(null, response.result);
        }
      });
    });
    //
    getAccounts = async function() {
      let payload = genRPCPayload("eth_accounts");
      return await promiseSend(payload);
    };
    //
    accounts = await getAccounts();
  });

  describe("#cfx_blockNumber", function() {
    it("should get blockNumber", async function() {
      let payload = genRPCPayload("eth_blockNumber");
      let blockNumber = await promiseSend(payload);
      blockNumber.should.be.a("string");
    });
  });

  describe("#cfx_accounts", function() {
    it("should get accounts", async function() {
      let payload = genRPCPayload("eth_accounts");
      let receivedAccounts = await promiseSend(payload);
      receivedAccounts.should.be.a("array");
    });
  });

  describe("#cfx_getBalance", function() {
    it("should get balance", async function() {
      let payload = genRPCPayload("eth_getBalance", [accounts[0]]);
      let balance = await promiseSend(payload);
      balance.should.be.a("string");
    });

    it("should get balance with block", async function() {
      let payload = genRPCPayload("eth_getBalance", [accounts[0], "latest"]);
      let balance = await promiseSend(payload);
      balance.should.be.a("string");
    });
  });

  describe("#cfx_getBlockByNumber", function() {
    it("should getBlockByNumber", async function() {
      let payload = genRPCPayload("eth_blockNumber");
      let number = await promiseSend(payload);
      payload = genRPCPayload("eth_getBlockByNumber", [number, false]);
      let block = await promiseSend(payload);
      block.should.be.a("object");
      block.should.have.keys(BlockKeys);
    });
  });

  describe("#cfx_gasPrice", function() {
    it("cfx_gasPrice", async function() {
      let payload = genRPCPayload("eth_gasPrice");
      let price = await promiseSend(payload);
      price.should.be.a("string");
    });
  });

  describe("#cfx_getTransactionCount", function() {
    it("should get TransactionCount", async function() {
      let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
      let nonce = await promiseSend(payload);
      nonce.should.be.a("string");
    });
  });

  describe("#cfx_getBlockByHash", function() {
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

  describe("#cfx_getTransactionByHash", function() {
    it("get transaction by hash", async function() {
      let txInfo = {
        from: accounts[1],
        to: accounts[0],
        value: DefalutValue,
        gasPrice: "0x2540be400"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      payload = genRPCPayload("eth_getTransactionByHash", [txHash]);
      let tx = await promiseSend(payload);
      tx.should.be.a("object");
      tx.should.have.keys(TxKeys);
    });
  });

  describe("#cfx_sendRawTransaction", function() {
    it("sendRawTx", async function() {
      // TODO
    });
  });

  describe("#cfx_estimateGas", function() {
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

  describe("#cfx_sendTransaction", function() {
    it("sendTx", async function() {
      let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
      let nonce = await promiseSend(payload);
      // console.log("nonce", nonce);
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: "0x100",
        nonce
        // gasPrice: "0x2540be400"
      };
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
      console.log("tx", txHash);
    });
  });

  describe("#cfx_call", function() {
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

  describe("#cfx_getCode", function() {
    it("getCode", async function() {
      let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
      let nonce = await promiseSend(payload);
      let txInfo = {
        from: accounts[0],
        data: MigrateByteCode, // a simple coin contract bytecode
        gas: "0x100000",
        nonce,
        value: "0x0"
      };
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
      payload = genRPCPayload("eth_getCode", [contractAddress, "latest"]);
      let code = await promiseSend(payload);
      code.should.be.a("string");
    });
  });

  describe("#cfx_getStorageAt", function() {
    it("get transaction by hash", async function() {
      let payload = genRPCPayload("eth_getStorageAt", [
        contractAddress,
        "0x0",
        "latest"
      ]);
      let storage = await promiseSend(payload);
      storage.should.be.a("string");
    });
  });
});
