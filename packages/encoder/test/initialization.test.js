"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
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
var path = require("path");
var fs = require("fs-extra");
var Encoder = require("..");
var Codec = require("@truffle/codec");
var Abi = require("@truffle/abi-utils");
var ganache_1 = require("ganache");
var helpers_1 = require("./helpers");
var artifacts;
var compilations;
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
          sourcePath = path.join(__dirname, name_1);
          _a = sources;
          _b = sourcePath;
          return [4 /*yield*/, fs.readFile(sourcePath, "utf8")];
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
            (compilations = _c.compilations);
          return [2 /*return*/];
      }
    });
  });
}, 50000);
describe.skip("Bytecodeless operation", function () {
  var encoder;
  var abi;
  var selector;
  beforeAll(function () {
    return __awaiter(void 0, void 0, void 0, function () {
      var artifact, anonymousArtifact;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            artifact = artifacts.TestInterface;
            anonymousArtifact = __assign(__assign({}, artifact), {
              contractName: undefined
            });
            return [
              4 /*yield*/,
              Encoder.forArtifact(anonymousArtifact, {
                projectInfo: { compilations: compilations }
              })
            ];
          case 1:
            encoder = _a.sent();
            abi = Abi.normalize(artifacts.TestInterface.abi).find(function (
              entry
            ) {
              return entry.type === "function" && entry.name === "doThings";
            });
            selector = Codec.AbiData.Utils.abiSelector(abi);
            return [2 /*return*/];
        }
      });
    });
  });
  it("Encodes integers", function () {
    return __awaiter(void 0, void 0, void 0, function () {
      var data;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [4 /*yield*/, encoder.encodeTxNoResolution(abi, [1])];
          case 1:
            data = _a.sent().data;
            chai_1.assert.strictEqual(
              data,
              selector +
                "0000000000000000000000000000000000000000000000000000000000000001"
            );
            return [2 /*return*/];
        }
      });
    });
  });
});
