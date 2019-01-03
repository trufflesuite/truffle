const doWhilst = require("async/doWhilst");
const inherits = require("util").inherits;
const Stoplight = require("web3-provider-engine/util/stoplight.js");
const createVm = require("ethereumjs-vm/dist/hooked").fromWeb3Provider;
const Block = require("ethereumjs-block");
const FakeTransaction = require("ethereumjs-tx/fake.js");
const ethUtil = require("ethereumjs-util");
const createPayload = require("web3-provider-engine/util/create-payload.js");
const rpcHexEncoding = require("web3-provider-engine/util/rpc-hex-encoding.js");
const Subprovider = require("web3-provider-engine/subproviders/subprovider.js");

module.exports = VmSubprovider;

// handles the following RPC methods:
//   eth_call
//   eth_estimateGas

inherits(VmSubprovider, Subprovider);

function VmSubprovider(opts) {
  const self = this;
  self.opts = opts || {};
  self.methods = ["eth_call", "eth_estimateGas"];
  // set initialization blocker
  self._ready = new Stoplight();
  self._blockGasLimit = null;
}

// setup a block listener on 'setEngine'
VmSubprovider.prototype.setEngine = function(engine) {
  const self = this;
  Subprovider.prototype.setEngine.call(self, engine);
  // unblock initialization after first block
  engine.once("block", function(block) {
    self._blockGasLimit = ethUtil.bufferToInt(block.gasLimit);
    self._ready.go();
  });
};

VmSubprovider.prototype.handleRequest = function(payload, next, end) {
  if (this.methods.indexOf(payload.method) < 0) {
    return next();
  }

  const self = this;
  switch (payload.method) {
    case "eth_call":
      self.runVm(payload, function(err, results) {
        if (err) return end(err);
        var result = "0x";
        if (!results.error && results.vm.return) {
          result = ethUtil.addHexPrefix(results.vm.return.toString("hex"));
        }
        end(null, result);
      });
      return;

    case "eth_estimateGas":
      self.estimateGas(payload, end);
      return;
  }
};

VmSubprovider.prototype.estimateGas = function(payload, end) {
  const self = this;
  var lo = 0;
  var hi = self._blockGasLimit;

  var minDiffBetweenIterations = 1200;
  var prevGasLimit = self._blockGasLimit;
  doWhilst(
    function(callback) {
      // Take a guess at the gas, and check transaction validity
      var mid = (hi + lo) / 2;
      payload.params[0].gas = mid;
      self.runVm(payload, function(err, results) {
        gasUsed = err
          ? self._blockGasLimit
          : ethUtil.bufferToInt(results.gasUsed);
        if (err || gasUsed === 0) {
          lo = mid;
        } else {
          hi = mid;
          // Perf improvement: stop the binary search when the difference in gas between two iterations
          // is less then `minDiffBetweenIterations`. Doing this cuts the number of iterations from 23
          // to 12, with only a ~1000 gas loss in precision.
          if (Math.abs(prevGasLimit - mid) < minDiffBetweenIterations) {
            lo = hi;
          }
        }
        prevGasLimit = mid;
        callback();
      });
    },
    function() {
      return lo + 1 < hi;
    },
    function(err) {
      if (err) {
        end(err);
      } else {
        hi = Math.floor(hi);
        var gasEstimateHex = rpcHexEncoding.intToQuantityHex(hi);
        end(null, gasEstimateHex);
      }
    }
  );
};

VmSubprovider.prototype.runVm = function(payload, cb) {
  const self = this;

  var blockData = self.currentBlock;
  var block = blockFromBlockData(blockData);
  var blockNumber = ethUtil.addHexPrefix(blockData.number.toString("hex"));

  // create vm with state lookup intercepted
  var vm = (self.vm = createVm(self.engine, blockNumber, {
    enableHomestead: true
  }));

  if (self.opts.debug) {
    vm.on("step", function(data) {
      console.log(data.opcode.name);
    });
  }

  // create tx
  var txParams = payload.params[0];
  // console.log('params:', payload.params)

  const normalizedTxParams = {
    to: txParams.to ? ethUtil.addHexPrefix(txParams.to) : undefined,
    from: txParams.from ? ethUtil.addHexPrefix(txParams.from) : undefined,
    value: txParams.value ? ethUtil.addHexPrefix(txParams.value) : undefined,
    data: txParams.data ? ethUtil.addHexPrefix(txParams.data) : undefined,
    gasLimit: txParams.gas
      ? ethUtil.addHexPrefix(txParams.gas)
      : block.header.gasLimit,
    gasPrice: txParams.gasPrice
      ? ethUtil.addHexPrefix(txParams.gasPrice)
      : undefined,
    nonce: txParams.nonce ? ethUtil.addHexPrefix(txParams.nonce) : undefined
  };
  var tx = new FakeTransaction(normalizedTxParams);
  tx._from =
    normalizedTxParams.from || "0x0000000000000000000000000000000000000000";

  vm.runTx(
    {
      tx: tx,
      block: block,
      skipNonce: true,
      skipBalance: true
    },
    function(err, results) {
      if (err) return cb(err);
      if (results.error != null) {
        return cb(new Error("VM error: " + results.error));
      }
      if (results.vm && results.vm.exception !== 1) {
        return cb(
          new Error(
            "VM Exception while executing " +
              payload.method +
              ": " +
              results.vm.exceptionError
          )
        );
      }

      cb(null, results);
    }
  );
};

function blockFromBlockData(blockData) {
  var block = new Block();
  // block.header.hash = ethUtil.addHexPrefix(blockData.hash.toString('hex'))

  block.header.parentHash = blockData.parentHash;
  block.header.uncleHash = blockData.sha3Uncles;
  block.header.coinbase = blockData.miner;
  block.header.stateRoot = blockData.stateRoot;
  block.header.transactionTrie = blockData.transactionsRoot;
  block.header.receiptTrie = blockData.receiptRoot || blockData.receiptsRoot;
  block.header.bloom = blockData.logsBloom;
  block.header.difficulty = blockData.difficulty;
  block.header.number = blockData.number;
  block.header.gasLimit =
    parseInt(blockData.gasLimit.toString("hex")) === 0
      ? Buffer.from(Number.MAX_SAFE_INTEGER.toString(16))
      : blockData.gasLimit;
  block.header.gasUsed = blockData.gasUsed;
  block.header.timestamp = blockData.timestamp;
  block.header.extraData = blockData.extraData;
  return block;
}
