"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: []
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var ganache_1 = require("ganache");
var EthUtil = require("ethereumjs-util");
var web3_1 = require("web3");
var __1 = require("..");
var mocha_1 = require("mocha");
(0, mocha_1.describe)("HD Wallet Provider", function () {
  var _this = this;
  var web3 = new web3_1.default();
  var ganacheProvider;
  var hdWalletProvider;
  (0, mocha_1.before)(function () {
    ganacheProvider = ganache_1.default.provider({
      miner: {
        instamine: "strict"
      },
      logging: {
        quiet: true
      }
    });
  });
  (0, mocha_1.after)(function () {
    return __awaiter(_this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [4 /*yield*/, ganacheProvider.disconnect()];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  (0, mocha_1.afterEach)(function () {
    web3.setProvider(undefined);
    if (hdWalletProvider) {
      hdWalletProvider.engine.stop();
    }
  });
  (0, mocha_1.describe)("instantiating with positional arguments", function () {
    (0, mocha_1.it)("provides for a mnemonic", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var truffleDevAccounts, mnemonic, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              truffleDevAccounts = [
                "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                "0xf17f52151ebef6c7334fad080c5704d77216b732",
                "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
                "0x821aea9a577a9b44299b9c15c88cf3087f3b5544",
                "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2",
                "0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e",
                "0x2191ef87e392377ec08e7c08eb105ef5448eced5",
                "0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5",
                "0x6330a553fc93768f612722bb8c2ec78ac90b3bbc",
                "0x5aeda56215b167893e80b4fe645ba6d5bab767de"
              ];
              mnemonic =
                "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
              hdWalletProvider = new __1.default(mnemonic, ganacheProvider);
              chai_1.assert.deepEqual(
                hdWalletProvider.getAddresses(),
                truffleDevAccounts
              );
              web3.setProvider(hdWalletProvider);
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
    (0, mocha_1.it)("throws on invalid mnemonic", function () {
      try {
        hdWalletProvider = new __1.default(
          "takoyaki is delicious",
          "http://localhost:8545"
        );
        chai_1.assert.fail("Should throw on invalid mnemonic");
      } catch (e) {
        (0, chai_1.assert)(e.message.includes("Mnemonic invalid or undefined"));
      }
    });
    (0, mocha_1.it)("provides for an array of private keys", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var privateKeys, privateKeysByAddress, addresses, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              privateKeys = [
                "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
                "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290"
              ];
              privateKeysByAddress = {
                "0xc515db5834d8f110eee96c3036854dbf1d87de2b":
                  "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
                "0xbd3366a0e5d2fb52691e3e08fabe136b0d4e5929":
                  "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290"
              };
              hdWalletProvider = new __1.default(privateKeys, ganacheProvider);
              web3.setProvider(hdWalletProvider);
              addresses = hdWalletProvider.getAddresses();
              chai_1.assert.equal(
                addresses.length,
                privateKeys.length,
                "incorrect number of wallets derived"
              );
              addresses.forEach(function (address) {
                (0,
                chai_1.assert)(EthUtil.isValidAddress(address), "invalid address");
                var privateKey = Buffer.from(
                  privateKeysByAddress[address],
                  "hex"
                );
                var expectedAddress = "0x".concat(
                  EthUtil.privateToAddress(privateKey).toString("hex")
                );
                chai_1.assert.equal(
                  address,
                  expectedAddress,
                  "incorrect address for private key"
                );
              });
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
    (0, mocha_1.it)("provides for a private key", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var privateKey, addresses, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              privateKey =
                "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580";
              hdWalletProvider = new __1.default(privateKey, ganacheProvider);
              web3.setProvider(hdWalletProvider);
              addresses = hdWalletProvider.getAddresses();
              chai_1.assert.equal(
                addresses[0],
                "0xc515db5834d8f110eee96c3036854dbf1d87de2b"
              );
              addresses.forEach(function (address) {
                (0,
                chai_1.assert)(EthUtil.isValidAddress(address), "invalid address");
              });
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
  });
  (0,
  mocha_1.describe)("instantiating with non-positional arguments", function () {
    (0, mocha_1.it)("provides for a mnemonic passed as an object", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var truffleDevAccounts, mnemonicPhrase, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              truffleDevAccounts = [
                "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                "0xf17f52151ebef6c7334fad080c5704d77216b732",
                "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
                "0x821aea9a577a9b44299b9c15c88cf3087f3b5544",
                "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2",
                "0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e",
                "0x2191ef87e392377ec08e7c08eb105ef5448eced5",
                "0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5",
                "0x6330a553fc93768f612722bb8c2ec78ac90b3bbc",
                "0x5aeda56215b167893e80b4fe645ba6d5bab767de"
              ];
              mnemonicPhrase =
                "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
              hdWalletProvider = new __1.default({
                mnemonic: {
                  phrase: mnemonicPhrase
                },
                provider: ganacheProvider
              });
              chai_1.assert.deepEqual(
                hdWalletProvider.getAddresses(),
                truffleDevAccounts
              );
              web3.setProvider(hdWalletProvider);
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
    (0, mocha_1.it)("provides for a mnemonic passed as a string", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var truffleDevAccounts, mnemonicPhrase, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              truffleDevAccounts = [
                "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                "0xf17f52151ebef6c7334fad080c5704d77216b732",
                "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
                "0x821aea9a577a9b44299b9c15c88cf3087f3b5544",
                "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2",
                "0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e",
                "0x2191ef87e392377ec08e7c08eb105ef5448eced5",
                "0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5",
                "0x6330a553fc93768f612722bb8c2ec78ac90b3bbc",
                "0x5aeda56215b167893e80b4fe645ba6d5bab767de"
              ];
              mnemonicPhrase =
                "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
              hdWalletProvider = new __1.default({
                mnemonic: mnemonicPhrase,
                provider: ganacheProvider
              });
              chai_1.assert.deepEqual(
                hdWalletProvider.getAddresses(),
                truffleDevAccounts
              );
              web3.setProvider(hdWalletProvider);
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
    (0, mocha_1.it)("provides for a mnemonic with a password", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var accounts, mnemonicPhrase, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              accounts = [
                "0x01d4195e36a244ceb6d6e2e55de1c406bf6089a0",
                "0x7e8f0f01542d14c1bfb9f07957ff61cade44abf3",
                "0x0d016902df6e479e766d7e1fb33efea4b779ac75",
                "0x7916ae4fdfe95a0487bb8742e73a2c44c7118702",
                "0x3bc32e23620a567d3cd2b41cc16c869f9923737e",
                "0x2b91922e2c17010bdae3ebfdb1fd608faae5c56a",
                "0xebc846a7ac330add2fc2ae8ea7cb1e76bad9447c",
                "0xcd7cbdef0dd539bfad28d995679575f0cebc940c",
                "0x11f1a3fa0e5c70fe6538aeb020ecca0faf6f7f70",
                "0x0a0d53ca0a996bf6bb4994514c3b6eb0c2b45e24"
              ];
              mnemonicPhrase =
                "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
              hdWalletProvider = new __1.default({
                mnemonic: {
                  phrase: mnemonicPhrase,
                  password: "yummy"
                },
                provider: ganacheProvider
              });
              chai_1.assert.deepEqual(
                hdWalletProvider.getAddresses(),
                accounts
              );
              web3.setProvider(hdWalletProvider);
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
    (0, mocha_1.it)("provides for a default polling interval", function () {
      var mnemonicPhrase =
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
      hdWalletProvider = new __1.default({
        mnemonic: {
          phrase: mnemonicPhrase
        },
        provider: ganacheProvider
        // polling interval is unspecified
      });
      chai_1.assert.ok(
        hdWalletProvider.engine,
        "Web3ProviderEngine instantiated"
      );
      chai_1.assert.ok(
        hdWalletProvider.engine._blockTracker,
        "PollingBlockTracker instantiated"
      );
      chai_1.assert.deepEqual(
        hdWalletProvider.engine._blockTracker._pollingInterval,
        4000,
        "PollingBlockTracker with expected pollingInterval"
      );
    });
    (0, mocha_1.it)("provides for a custom polling interval", function () {
      var mnemonicPhrase =
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
      hdWalletProvider = new __1.default({
        mnemonic: {
          phrase: mnemonicPhrase
        },
        provider: ganacheProvider,
        // double the default value, for less chatty JSON-RPC
        pollingInterval: 8000
      });
      chai_1.assert.ok(
        hdWalletProvider.engine,
        "Web3ProviderEngine instantiated"
      );
      chai_1.assert.ok(
        hdWalletProvider.engine._blockTracker,
        "PollingBlockTracker instantiated"
      );
      chai_1.assert.deepEqual(
        hdWalletProvider.engine._blockTracker._pollingInterval,
        8000,
        "PollingBlockTracker with expected pollingInterval"
      );
    });
    (0, mocha_1.it)("provides for an array of private keys", function () {
      return __awaiter(_this, void 0, void 0, function () {
        var privateKeys, privateKeysByAddress, addresses, number;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              privateKeys = [
                "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
                "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290"
              ];
              privateKeysByAddress = {
                "0xc515db5834d8f110eee96c3036854dbf1d87de2b":
                  "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
                "0xbd3366a0e5d2fb52691e3e08fabe136b0d4e5929":
                  "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290"
              };
              hdWalletProvider = new __1.default({
                privateKeys: privateKeys,
                provider: ganacheProvider
              });
              web3.setProvider(hdWalletProvider);
              addresses = hdWalletProvider.getAddresses();
              chai_1.assert.equal(
                addresses.length,
                privateKeys.length,
                "incorrect number of wallets derived"
              );
              addresses.forEach(function (address) {
                (0,
                chai_1.assert)(EthUtil.isValidAddress(address), "invalid address");
                var privateKey = Buffer.from(
                  privateKeysByAddress[address],
                  "hex"
                );
                var expectedAddress = "0x".concat(
                  EthUtil.privateToAddress(privateKey).toString("hex")
                );
                chai_1.assert.equal(
                  address,
                  expectedAddress,
                  "incorrect address for private key"
                );
              });
              return [4 /*yield*/, web3.eth.getBlockNumber()];
            case 1:
              number = _a.sent();
              (0, chai_1.assert)(number === BigInt(0));
              return [2 /*return*/];
          }
        });
      });
    });
    (0, mocha_1.describe)("instantiation errors", function () {
      (0, mocha_1.it)("throws on invalid providers", function () {
        try {
          hdWalletProvider = new __1.default({
            mnemonic: {
              phrase:
                "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
            },
            // @ts-ignore we gotta do the bad thing here to get the test right
            provider: { junk: "in", an: "object" }
          });
          chai_1.assert.fail("Should throw on invalid provider");
        } catch (e) {
          (0,
          chai_1.assert)(e.message.includes("invalid provider was specified"));
        }
      });
      (0, mocha_1.it)("throws on invalid urls", function () {
        try {
          hdWalletProvider = new __1.default({
            mnemonic: {
              phrase:
                "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
            },
            url: "justABunchOfJunk"
          });
          chai_1.assert.fail("Should throw on invalid url");
        } catch (e) {
          (0,
          chai_1.assert)(e.message.includes("invalid provider was specified"));
        }
      });
      (0, mocha_1.it)("throws on invalid mnemonic", function () {
        try {
          hdWalletProvider = new __1.default({
            mnemonic: {
              phrase: "I am not a crook"
            },
            url: "http://localhost:8545"
          });
          chai_1.assert.fail("Should throw on invalid mnemonic");
        } catch (e) {
          (0,
          chai_1.assert)(e.message.includes("Mnemonic invalid or undefined"));
        }
      });
    });
  });
});
