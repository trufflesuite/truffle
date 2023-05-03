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
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEqTx = exports.prepareContracts = void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)("encoder:test:helpers");
var path_1 = require("path");
var chai_1 = require("chai");
var bn_js_1 = require("bn.js");
var fs_extra_1 = require("fs-extra");
var tmp_1 = require("tmp");
var web3_1 = require("web3");
var Codec = require("@truffle/codec");
var config_1 = require("@truffle/config");
var workflow_compile_1 = require("@truffle/workflow-compile");
//sorry, some untyped imports here :-/
var Deployer = require("@truffle/deployer");
var Resolver = require("@truffle/resolver").Resolver; //resolver is TS too but I can't make it typecheck :-/
function createSandboxFrom(source) {
  if (!fs_extra_1.default.existsSync(source)) {
    throw new Error(
      "Sandbox failed: source: ".concat(source, " does not exist")
    );
  }
  var tempDir = tmp_1.default.dirSync({ unsafeCleanup: true });
  fs_extra_1.default.copySync(source, tempDir.name);
  var config = config_1.default.load(
    path_1.default.join(tempDir.name, "truffle-config.js"),
    {}
  );
  return config;
}
function prepareContracts(sources, addresses, provider) {
  return __awaiter(this, void 0, void 0, function () {
    var web3,
      from,
      config,
      registryAddress,
      rawCompilations,
      artifacts,
      compilations;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          web3 = new web3_1.default();
          web3.setProvider(provider);
          return [4 /*yield*/, web3.eth.getAccounts()];
        case 1:
          from = _a.sent()[0];
          config = createSandbox();
          config.compilers.solc.version = "0.8.9";
          config.networks["encoder"] = {
            network_id: "*",
            provider: provider,
            from: from
          };
          config.network = "encoder";
          config.ens = { enabled: true };
          return [4 /*yield*/, addContracts(config, sources)];
        case 2:
          _a.sent();
          return [4 /*yield*/, setUpENS(config, addresses, from)];
        case 3:
          registryAddress = _a.sent();
          return [4 /*yield*/, compile(config)];
        case 4:
          rawCompilations = _a.sent().compilations;
          artifacts = Object.assign.apply(
            Object,
            __spreadArray(
              [{}],
              rawCompilations.map(function (compilation) {
                return Object.assign.apply(
                  Object,
                  __spreadArray(
                    [{}],
                    compilation.contracts.map(function (contract) {
                      var _a;
                      return (
                        (_a = {}), (_a[contract.contractName] = contract), _a
                      );
                    }),
                    false
                  )
                );
              }),
              false
            )
          );
          compilations =
            Codec.Compilations.Utils.shimCompilations(rawCompilations);
          return [
            2 /*return*/,
            {
              artifacts: artifacts,
              compilations: compilations,
              config: config,
              registryAddress: registryAddress
            }
          ];
      }
    });
  });
}
exports.prepareContracts = prepareContracts;
function createSandbox() {
  var config = createSandboxFrom(
    path_1.default.join(__dirname, "fixture", "bare-box")
  );
  config.resolver = new Resolver(config);
  config.networks = {};
  return config;
}
function addContracts(config, sources) {
  if (sources === void 0) {
    sources = {};
  }
  return __awaiter(this, void 0, void 0, function () {
    var promises, _i, _a, filename, source;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          promises = [];
          for (_i = 0, _a = Object.keys(sources); _i < _a.length; _i++) {
            filename = _a[_i];
            source = sources[filename];
            promises.push(
              fs_extra_1.default.outputFile(
                path_1.default.join(config.contracts_directory, filename),
                source
              )
            );
          }
          return [4 /*yield*/, Promise.all(promises)];
        case 1:
          _b.sent();
          return [2 /*return*/];
      }
    });
  });
}
function compile(config) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [
            4 /*yield*/,
            workflow_compile_1.default.compile(
              config.with({
                all: true,
                quiet: true
              })
            )
          ];
        case 1:
          return [2 /*return*/, _a.sent()];
      }
    });
  });
}
function setUpENS(config, addresses, from) {
  return __awaiter(this, void 0, void 0, function () {
    var deployer, _i, _a, _b, name_1, address;
    return __generator(this, function (_c) {
      switch (_c.label) {
        case 0:
          deployer = new Deployer(config);
          return [4 /*yield*/, deployer.start()];
        case 1:
          _c.sent();
          (_i = 0), (_a = Object.entries(addresses));
          _c.label = 2;
        case 2:
          if (!(_i < _a.length)) return [3 /*break*/, 5];
          (_b = _a[_i]), (name_1 = _b[0]), (address = _b[1]);
          return [
            4 /*yield*/,
            deployer.ens.setAddress(name_1, address, { from: from })
          ];
        case 3:
          _c.sent();
          _c.label = 4;
        case 4:
          _i++;
          return [3 /*break*/, 2];
        case 5:
          return [4 /*yield*/, deployer.finish()];
        case 6:
          _c.sent();
          return [2 /*return*/, deployer.ens.devRegistry.address];
      }
    });
  });
}
//deepEqual doesn't seem to work for BNs here, so we'll do this
//manually instead :-/
function checkEqTx(result, expected) {
  chai_1.assert.hasAllKeys(result, expected);
  for (var _i = 0, _a = Object.entries(result); _i < _a.length; _i++) {
    var _b = _a[_i],
      key = _b[0],
      value = _b[1];
    if (bn_js_1.default.isBN(expected[key])) {
      (0, chai_1.assert)(bn_js_1.default.isBN(value));
      (0, chai_1.assert)(value.eq(expected[key]));
    } else {
      chai_1.assert.deepEqual(value, expected[key]);
    }
  }
}
exports.checkEqTx = checkEqTx;
