const { HttpProvider, ethToConflux } = require("../src/");
// eslint-disable-next-line no-unused-vars
const should = require("chai").should();
const {
  bytecode: MigrateByteCode,
  last_completed_migration_data: CallData
} = require("./contract.json");
const {
  genRPCPayload,
  BlockKeys,
  TxKeys,
  DefalutValue,
  // eslint-disable-next-line no-unused-vars
  wait,
  ReceiptKeys
} = require("./");
const URL = "http://127.0.0.1:12537";

let ethProvider = new HttpProvider(URL, {
  chainAdaptor: ethToConflux({ url: URL })
});

describe("CFX get RPCs", function() {
  let accounts;

  before(async function() {
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
      let payload = genRPCPayload("eth_getBlockByNumber", ["latest", false]);
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
      let payload = genRPCPayload("eth_getBlockByNumber", ["latest", false]);
      let block = await promiseSend(payload);
      payload = genRPCPayload("eth_getBlockByHash", [block.hash, true]);
      block = await promiseSend(payload);
      block.should.be.a("object");
      block.should.have.keys(BlockKeys);
    });
  });
});

describe("CFX TX relate RPCs", function() {
  let accounts;

  before(async function() {
    accounts = await getAccounts();
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
    this.timeout(5000);
    it("should send a simple transfer tx", async function() {
      let noncePayload = genRPCPayload("eth_getTransactionCount", [
        accounts[0]
      ]);
      let nonce = await promiseSend(noncePayload);
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: DefalutValue,
        nonce
        // gasPrice: "0x2540be400"
      };
      let sendTxPayload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(sendTxPayload);
      txHash.should.be.a("string");

      let receipt = await confirmTx(txHash);
      receipt.should.have.keys(ReceiptKeys);
      receipt.should.have.property("status", "0x1");
    });

    it("should deploy an contract", async function() {
      let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
      let nonce = await promiseSend(payload);
      let txInfo = {
        from: accounts[0],
        value: "0x0",
        nonce,
        data: MigrateByteCode,
        gasPrice: "0x10000",
        storageLimit: "0x10000"
      };
      payload = genRPCPayload("eth_estimateGas", [txInfo]);
      let estimate = await promiseSend(payload);
      txInfo.gas = estimate + "0";
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");

      let receipt = await confirmTx(txHash);
      receipt.should.have.property("status", "0x1");
    });

    it("should send an tx with all parameter", async function() {
      let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
      let nonce = await promiseSend(payload);
      let txInfo = {
        from: accounts[0],
        to: accounts[1],
        value: DefalutValue,
        nonce,
        gas: "0x10000",
        gasPrice: "0x10000",
        storageLimit: "0x10000"
      };
      payload = genRPCPayload("eth_blockNumber");
      let number = await promiseSend(payload);
      txInfo.epochHeight = number;
      payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");

      let receipt = await confirmTx(txHash);
      receipt.should.have.keys(ReceiptKeys);
      receipt.should.have.property("status", "0x1");
    });
  });

  describe("#cfx_getTransactionByHash", function() {
    this.timeout(5000);
    it("get transaction by hash", async function() {
      let txInfo = {
        from: accounts[1],
        to: accounts[0],
        value: DefalutValue
        // gasPrice: "0x2540be400"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      payload = genRPCPayload("eth_getTransactionByHash", [txHash]);
      let tx = await promiseSend(payload);
      tx.should.be.a("object");
      tx.should.have.keys(TxKeys);
    });
  });

  describe("#cfx_getTransactionReceipt", function() {
    this.timeout(5000);
    it("should get tx receipt", async function() {
      let txInfo = {
        from: accounts[0],
        data: MigrateByteCode, // a simple coin contract bytecode
        gas: "0x100000",
        gasPrice: "0x100",
        value: "0x0"
      };
      let payload = genRPCPayload("eth_sendTransaction", [txInfo]);
      let txHash = await promiseSend(payload);
      txHash.should.be.a("string");
      await wait(3);
      payload = genRPCPayload("eth_getTransactionReceipt", [txHash]);
      let receipt = await promiseSend(payload);
      receipt.should.have.keys(ReceiptKeys);
    });
  });

  /* describe("#cfx_sendRawTransaction", function() {
    it("sendRawTx", async function() {
    });
  }); */
});

describe("CFX contract relate RPCs", function() {
  this.timeout(30000);

  let accounts;
  let contractAddress = "";

  before(async function() {
    accounts = await getAccounts();

    let payload = genRPCPayload("eth_getTransactionCount", [accounts[0]]);
    let nonce = await promiseSend(payload);
    let txInfo = {
      from: accounts[0],
      value: "0x0",
      nonce,
      data: MigrateByteCode,
      gasPrice: "0x10000",
      storageLimit: "0x10000"
    };
    payload = genRPCPayload("eth_estimateGas", [txInfo]);
    let estimate = await promiseSend(payload);
    txInfo.gas = estimate + "0";
    payload = genRPCPayload("eth_sendTransaction", [txInfo]);
    let txHash = await promiseSend(payload);
    let receipt = await confirmTx(txHash);
    receipt.should.have.property("status", "0x1");
    contractAddress = receipt.contractAddress;
    // console.log('The contract address: ', contractAddress);
  });

  describe("#cfx_getLogs", function() {
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

  describe("#cfx_call", function() {
    it("cfx_call", async function() {
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
      let payload = genRPCPayload("eth_getCode", [contractAddress, "latest"]);
      let code = await promiseSend(payload);
      code.should.be.a("string");
    });
  });

  describe("#cfx_getStorageAt", function() {
    it("getStorageAt", async function() {
      let index = "0".padStart(64, 0); // TODO proxy need support 0x100
      let payload = genRPCPayload("eth_getStorageAt", [
        contractAddress,
        `0x${index}`,
        "latest"
      ]);
      let storage = await promiseSend(payload);
      storage.should.be.a("string");
    });
  });
});

function promiseSend(payload) {
  return new Promise(function(resolve, reject) {
    ethProvider.send(payload, function(err, response) {
      if (err || response.error) {
        console.error(response.error, payload.method);
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

async function confirmTx(txHash) {
  let receipt;
  while (true) {
    let payload = genRPCPayload("eth_getTransactionReceipt", [txHash]);
    receipt = await promiseSend(payload);
    if (receipt) {
      return receipt;
    }
    await wait(3);
  }
}
