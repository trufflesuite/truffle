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
var debug_1 = require("debug");
var debug = (0, debug_1.default)("encoder:test");
var chai_1 = require("chai");
var path_1 = require("path");
var fs_extra_1 = require("fs-extra");
var Encoder = require("..");
var Codec = require("@truffle/codec");
var Abi = require("@truffle/abi-utils");
var ganache_1 = require("ganache");
var helpers_1 = require("./helpers");
var artifacts;
var compilations;
var config;
var registryAddress;
var addresses = {
  "locate.gold": "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
};
beforeAll(function () {
  return __awaiter(void 0, void 0, void 0, function () {
    var provider,
      sourceNames,
      sources,
      _i,
      sourceNames_1,
      name_1,
      sourcePath,
      _a,
      _b;
    var _c;
    return __generator(this, function (_d) {
      switch (_d.label) {
        case 0:
          provider = ganache_1.default.provider({
            seed: "encoder",
            gasLimit: 7000000,
            logging: {
              quiet: true
            },
            miner: {
              //note: we should ideally set strict here, but that causes a test
              //failure in the ENS testing; we should figure out what's up with
              //that so we can set strict
              instamine: "eager"
            }
          });
          sourceNames = ["EncoderTests.sol", "DecimalTest.vy"];
          sources = {};
          (_i = 0), (sourceNames_1 = sourceNames);
          _d.label = 1;
        case 1:
          if (!(_i < sourceNames_1.length)) return [3 /*break*/, 4];
          name_1 = sourceNames_1[_i];
          sourcePath = path_1.default.join(__dirname, name_1);
          _a = sources;
          _b = sourcePath;
          return [4 /*yield*/, fs_extra_1.default.readFile(sourcePath, "utf8")];
        case 2:
          _a[_b] = _d.sent();
          _d.label = 3;
        case 3:
          _i++;
          return [3 /*break*/, 1];
        case 4:
          return [
            4 /*yield*/,
            (0, helpers_1.prepareContracts)(sources, addresses, provider)
          ];
        case 5:
          (_c = _d.sent()),
            (artifacts = _c.artifacts),
            (compilations = _c.compilations),
            (config = _c.config),
            (registryAddress = _c.registryAddress);
          return [2 /*return*/];
      }
    });
  });
}, 50000);
describe("Encoding", function () {
  describe("Addresses and contracts", function () {
    var encoder;
    var abi;
    var selector;
    var contractAbi;
    var contractSelector;
    var contractType;
    var udvtType;
    beforeAll(function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var userDefinedTypes;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                Encoder.forArtifact(artifacts.TestContract, {
                  projectInfo: { compilations: compilations },
                  ens: {
                    provider: config.provider,
                    registryAddress: registryAddress
                  }
                })
              ];
            case 1:
              encoder = _a.sent();
              abi = Abi.normalize(artifacts.TestContract.abi).find(function (
                entry
              ) {
                return (
                  entry.type === "function" && entry.name === "takesAddress"
                );
              });
              selector = Codec.AbiData.Utils.abiSelector(abi);
              contractAbi = Abi.normalize(artifacts.TestContract.abi).find(
                function (entry) {
                  return (
                    entry.type === "function" && entry.name === "takesContract"
                  );
                }
              );
              contractSelector = Codec.AbiData.Utils.abiSelector(contractAbi);
              userDefinedTypes = encoder
                .getProjectEncoder()
                .getUserDefinedTypes();
              contractType = Object.values(userDefinedTypes).find(function (
                type
              ) {
                return (
                  type.typeClass === "contract" &&
                  type.typeName === "TestContract"
                );
              });
              udvtType = Object.values(userDefinedTypes).find(function (type) {
                return (
                  type.typeClass === "userDefinedValueType" &&
                  type.typeName === "Account" &&
                  type.kind === "local" &&
                  type.definingContractName === "TestContract"
                );
              });
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes addresses with good checksum", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes addresses in all lowercase", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0x10ca7e901d10ca7e901d10ca7e901d10ca7e901d"
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes addresses in all uppercase", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0X10CA7E901D10CA7E901D10CA7E901D10CA7E901D"
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes addresses without 0x prefix", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes ICAP addresses", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "XE19HOWVEXINGLYQUICKDAFTZEBRASJUMP"
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "0000000000000000000000000435099d36c1e39b0718325d179e598075a395d1"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes objects with an address field", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  {
                    address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                    garbage: "garbage"
                  }
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes callable objects with an address field", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var input, data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              input = function () {
                return undefined;
              };
              input.address = "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D";
              input.garbate = "garbage";
              return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [input])];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes ENS names", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, ["locate.gold"])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes contracts", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(contractAbi, [
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                contractSelector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes type/value pairs (address)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  {
                    type: "address",
                    value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                  }
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes type/value pairs (contract)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  {
                    type: "contract",
                    value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                  }
                ])
              ];
            case 1:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes wrapped addresses", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var wrapped, data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.wrapElementaryValue(
                  { typeClass: "address", kind: "general" },
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                )
              ];
            case 1:
              wrapped = _a.sent();
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [wrapped])
              ];
            case 2:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes wrapped contracts", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var wrapped, data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.wrapElementaryValue(
                  contractType,
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                )
              ];
            case 1:
              wrapped = _a.sent();
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [wrapped])
              ];
            case 2:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Encodes wrapped UDVTs", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var wrapped, data;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.wrapElementaryValue(
                  udvtType,
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                )
              ];
            case 1:
              wrapped = _a.sent();
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [wrapped])
              ];
            case 2:
              data = _a.sent().data;
              chai_1.assert.strictEqual(
                data,
                selector +
                  "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects bad checksum w/ mixed-case", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901d"
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Bad checksum should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_1 = _a.sent();
              if (error_1.name !== "TypeMismatchError") {
                throw error_1;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects bad ICAP checksum", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "XE18HOWVEXINGLYQUICKDAFTZEBRASJUMP"
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Bad ICAP checksum should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_2 = _a.sent();
              if (error_2.name !== "TypeMismatchError") {
                throw error_2;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects incorrect length (long)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0x0010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Wrong-length address should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_3 = _a.sent();
              if (error_3.name !== "TypeMismatchError") {
                throw error_3;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects incorrect length (short)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_4;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0xca7e901d10ca7e901d10ca7e901d10ca7e901d"
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Wrong-length address should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_4 = _a.sent();
              if (error_4.name !== "TypeMismatchError") {
                throw error_4;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects incorrect length (long, no prefix)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_5;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "0010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Wrong-length address should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_5 = _a.sent();
              if (error_5.name !== "TypeMismatchError") {
                throw error_5;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects incorrect length (short, no prefix)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_6;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  "ca7e901d10ca7e901d10ca7e901d10ca7e901d"
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Wrong-length address should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_6 = _a.sent();
              if (error_6.name !== "TypeMismatchError") {
                throw error_6;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects unknown ENS name", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, ["garbage.eth"])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Unknown ENS names should not be encoded");
              return [3 /*break*/, 3];
            case 2:
              error_7 = _a.sent();
              if (error_7.name !== "TypeMismatchError") {
                throw error_7;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects objects with a selector field", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_8;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  {
                    address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                    selector: "0xdeadbeef"
                  }
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail(
                "Contract objects must not have selector field"
              );
              return [3 /*break*/, 3];
            case 2:
              error_8 = _a.sent();
              if (error_8.name !== "TypeMismatchError") {
                throw error_8;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects other input (test: null)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_9;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [null])];
            case 1:
              _a.sent();
              chai_1.assert.fail("Null should not be encoded as an address");
              return [3 /*break*/, 3];
            case 2:
              error_9 = _a.sent();
              if (error_9.name !== "TypeMismatchError") {
                throw error_9;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects other input (test: undefined)", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_10;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [undefined])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail(
                "Undefined should not be encoded as an address"
              );
              return [3 /*break*/, 3];
            case 2:
              error_10 = _a.sent();
              if (error_10.name !== "TypeMismatchError") {
                throw error_10;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects other input (test: {})", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_11;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [{}])];
            case 1:
              _a.sent();
              chai_1.assert.fail(
                "Empty object should not be encoded as an address"
              );
              return [3 /*break*/, 3];
            case 2:
              error_11 = _a.sent();
              if (error_11.name !== "TypeMismatchError") {
                throw error_11;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects type/value pair for wrong type", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_12;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  {
                    type: "bytes20",
                    value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                  }
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail(
                "Value specified as bytes20 got encoded as address"
              );
              return [3 /*break*/, 3];
            case 2:
              error_12 = _a.sent();
              if (error_12.name !== "TypeMismatchError") {
                throw error_12;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects nested type/value pair", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var error_13;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              _a.trys.push([0, 2, , 3]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [
                  {
                    type: "address",
                    value: {
                      type: "address",
                      value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                    }
                  }
                ])
              ];
            case 1:
              _a.sent();
              chai_1.assert.fail("Nested type/value pair got encoded");
              return [3 /*break*/, 3];
            case 2:
              error_13 = _a.sent();
              if (error_13.name !== "TypeMismatchError") {
                throw error_13;
              }
              return [3 /*break*/, 3];
            case 3:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects wrapped value for wrong type", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var wrapped, error_14;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                encoder.wrapElementaryValue(
                  { typeClass: "bytes", kind: "static", length: 20 },
                  "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
                )
              ];
            case 1:
              wrapped = _a.sent();
              _a.label = 2;
            case 2:
              _a.trys.push([2, 4, , 5]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [wrapped])
              ];
            case 3:
              _a.sent();
              chai_1.assert.fail(
                "Value wrapped as bytes20 got encoded as address"
              );
              return [3 /*break*/, 5];
            case 4:
              error_14 = _a.sent();
              if (error_14.name !== "TypeMismatchError") {
                throw error_14;
              }
              return [3 /*break*/, 5];
            case 5:
              return [2 /*return*/];
          }
        });
      });
    });
    it("Rejects wrapped error result", function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var wrapped, error_15;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              wrapped = {
                type: { typeClass: "address", kind: "general" },
                kind: "error",
                error: {
                  kind: "ReadErrorStack",
                  from: 0,
                  to: 0
                }
              };
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [
                4 /*yield*/,
                encoder.encodeTxNoResolution(abi, [wrapped])
              ];
            case 2:
              _a.sent();
              chai_1.assert.fail("Error result got encoded as address");
              return [3 /*break*/, 4];
            case 3:
              error_15 = _a.sent();
              if (error_15.name !== "TypeMismatchError") {
                throw error_15;
              }
              return [3 /*break*/, 4];
            case 4:
              return [2 /*return*/];
          }
        });
      });
    });
  });
});
