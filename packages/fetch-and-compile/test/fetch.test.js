"use strict";
var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b)
            if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError(
          "Class extends value " + String(b) + " is not a constructor or null"
        );
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();
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
var debug = (0, debug_1.default)("fetch-and-compile:test");
var chai_1 = require("chai");
require("mocha");
var config_1 = require("@truffle/config");
var index_1 = require("../lib/index");
var axios_1 = require("axios");
var sinon_1 = require("sinon");
var path_1 = require("path");
var fs_1 = require("fs");
var etherscanFixture = require("./fixture.js").etherscanFixture;
//used by the sourcify fake
var NotFoundError = /** @class */ (function (_super) {
  __extends(NotFoundError, _super);
  function NotFoundError() {
    var _this = _super.call(this) || this;
    _this.response = { status: 404 };
    return _this;
  }
  return NotFoundError;
})(Error);
beforeEach(function () {
  sinon_1.default
    .stub(axios_1.default, "get")
    .withArgs(
      sinon_1.default.match.in(Object.keys(etherscanFixture)),
      sinon_1.default.match.any
    )
    .callsFake(function (url, requestConfig) {
      return __awaiter(this, void 0, void 0, function () {
        var address;
        return __generator(this, function (_a) {
          debug("url: %s", url);
          debug("requestConfig: %o", requestConfig);
          if (requestConfig === undefined) {
            //apologies for the misuse of assertions, but I can't
            //get this to compile otherwise due to strictNullChecks
            chai_1.assert.fail("requestConfig was undefined");
          }
          address = requestConfig.params.address;
          return [2 /*return*/, { data: etherscanFixture[url][address] }];
        });
      });
    });
  sinon_1.default
    .stub(axios_1.default, "request")
    .withArgs(
      sinon_1.default.match.has(
        "url",
        sinon_1.default.match(/^https:\/\/repo\.sourcify\.dev\//)
      )
    )
    .callsFake(function (requestConfig) {
      return __awaiter(this, void 0, void 0, function () {
        var url, responseType, match, filePath, contents;
        return __generator(this, function (_a) {
          if (requestConfig === undefined) {
            //apologies *again* for the misuse of assertions, but see above
            chai_1.assert.fail("requestConfig was undefined");
          }
          (url = requestConfig.url),
            (responseType = requestConfig.responseType);
          if (url === undefined) {
            //and again...
            chai_1.assert.fail("requestConfig was undefined");
          }
          match = url.match(/^https:\/\/repo\.sourcify\.dev\/(.*)/);
          if (!match) {
            //this can't happen, but TS doesn't know that
            chai_1.assert.fail("URL didn't match despite matching");
          }
          filePath = path_1.default.join(
            __dirname,
            "./sources/sourcify",
            match[1]
          );
          debug("filePath: %s", filePath);
          if (!fs_1.default.existsSync(filePath)) {
            debug("throwing!");
            throw new NotFoundError();
          }
          contents = fs_1.default.readFileSync(filePath, "utf8");
          return [
            2 /*return*/,
            responseType === "json"
              ? { data: JSON.parse(contents) }
              : { data: contents }
          ];
        });
      });
    });
  //TS can't detect that is a sinon stub so we have to use ts-ignore
  //@ts-ignore
  axios_1.default.get.callThrough();
  //@ts-ignore
  axios_1.default.request.callThrough();
});
afterEach(function () {
  //restoring stubs
  //TS can't detect that is a sinon stub so we have to use ts-ignore
  //@ts-ignore
  axios_1.default.get.restore();
  //@ts-ignore
  axios_1.default.request.restore();
});
describe("Supported networks", function () {
  it("Lists supported networks", function () {
    var networks = (0, index_1.getSupportedNetworks)();
    chai_1.assert.property(networks, "mainnet");
    chai_1.assert.notProperty(
      networks,
      "completelymadeupnetworkthatwillneverexist"
    );
    chai_1.assert.deepEqual(networks.mainnet, {
      name: "mainnet",
      networkId: 1,
      chainId: 1,
      fetchers: ["etherscan", "sourcify"]
    });
  });
  it("Lists supported networks for specified fetchers only", function () {
    var networks = (0, index_1.getSupportedNetworks)(["etherscan"]);
    chai_1.assert.property(networks, "mainnet");
    chai_1.assert.notProperty(networks, "sokol-poa"); //suported by sourcify but not etherscan
    chai_1.assert.deepEqual(networks.mainnet, {
      name: "mainnet",
      networkId: 1,
      chainId: 1,
      fetchers: ["etherscan"] //should not include sourcify if that fetcher not requested
    });
  });
});
describe("Etherscan single-source Solidity case", function () {
  it("verifies contract from mainnet", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1,
                "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                "etherscan",
                "UniswapV2Router02"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from goerli", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                5,
                "0xeBC990735Aafd169415D675B6e90aB901f8BDae1",
                "etherscan",
                "ExternalTestSingle"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from arbitrum", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                42161,
                "0x2B52D1B2b359eA39536069D8c6f2a3CFE3a09c31",
                "etherscan",
                "Storage"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from polygon", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                137,
                "0xCF79C5417934ECde6BA055C0119A03380CE28DEC",
                "etherscan",
                "Auction"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from polygon mumbai", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                80001,
                "0xF618d6deB4C4F24776810ec3221dFe211b979B4F",
                "etherscan",
                "HelloWorld"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from optimism", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                10,
                "0xca5f37e6D8bB24c5A7958d5eccE7Bd9Aacc944f2",
                "etherscan",
                "InstaERC20Resolver"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from moonbeam", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1284,
                "0x23eA13c920aF82353872E36CaE99797fb28a8981",
                "etherscan",
                "TimelockController"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from moonriver", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1285,
                "0x56f4ca4f9dbb29c9438d9de48bd07f4b7fa765a3",
                "etherscan",
                "ERC1967Proxy"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies contract from moonbase alpha", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1287,
                "0xf85544ea3dd634ebe9a61d963295b054adb0c803",
                "etherscan",
                "AddressStore"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
});
describe("Etherscan Solidity multi-source and JSON cases", function () {
  it("verifies Etherscan multi-source contract", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1,
                "0x60BB16c4A931b1a0B8A7D945C651DD90f41D42Cf",
                "etherscan",
                "ERC20"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies Etherscan JSON-format contract", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1,
                "0xede17dF1a202Ca498a822151079648aCa96e2633",
                "etherscan",
                "L1StandardBridge"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
});
describe("Sourcify cases", function () {
  it("verifies mainnet Sourcify contract, full match", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                1,
                "0xa300126AaFD90F59B35Fd47C1dc4D4563545Cf1e",
                "sourcify",
                "Forwarder"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
  it.only("verifies mainnet Sourcify contract, partial match", function () {
    return __awaiter(this, void 0, void 0, function () {
      var e_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            return [
              4 /*yield*/,
              runTestBody(
                1,
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                "sourcify",
                "WETH9"
              )
            ];
          case 1:
            _a.sent();
            return [3 /*break*/, 3];
          case 2:
            e_1 = _a.sent();
            console.log(e_1);
            return [3 /*break*/, 3];
          case 3:
            return [2 /*return*/];
        }
      });
    });
  });
  it("verifies goerli Sourcify contract with special characters in path", function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [
              4 /*yield*/,
              runTestBody(
                5,
                "0x18019753569c1fa1536f11DBFd80F373D2e05728",
                "sourcify",
                "ExternalTestWacky"
              )
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
});
describe("fetchAndCompileMultiple", function () {
  it("verifies contracts from mainnet", function () {
    return __awaiter(this, void 0, void 0, function () {
      var config, addresses, _a, results, failures, expectedNames, _loop_1, i;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            config = config_1.default.default().merge({
              networks: {
                mainnet: {
                  network_id: 1
                }
              },
              network: "mainnet",
              sourceFetchers: ["etherscan"]
            });
            addresses = [
              "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
              "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
            ];
            return [
              4 /*yield*/,
              (0, index_1.fetchAndCompileMultiple)(addresses, config)
            ];
          case 1:
            (_a = _b.sent()), (results = _a.results), (failures = _a.failures);
            chai_1.assert.isEmpty(failures); //there should be no failures
            expectedNames = ["UniswapV2Router02", "ENSRegistryWithFallback"];
            _loop_1 = function (i) {
              var result = results[addresses[i]];
              chai_1.assert.equal(result.fetchedVia, "etherscan");
              var contractNameFromSourceInfo = result.sourceInfo.contractName;
              chai_1.assert.equal(contractNameFromSourceInfo, expectedNames[i]);
              var contractsFromCompilation =
                result.compileResult.compilations[0].contracts;
              (0, chai_1.assert)(
                contractsFromCompilation.some(function (contract) {
                  return contract.contractName === expectedNames[i];
                })
              );
              (0, chai_1.assert)(
                result.compileResult.contracts.some(function (contract) {
                  return contract.contractName === expectedNames[i];
                })
              );
            };
            for (i = 0; i < addresses.length; i++) {
              _loop_1(i);
            }
            return [2 /*return*/];
        }
      });
    });
  });
});
function runTestBody(networkId, address, fetcherName, expectedName) {
  return __awaiter(this, void 0, void 0, function () {
    var config, result, contractNameFromSourceInfo, contractsFromCompilation;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          config = config_1.default.default().merge({
            networks: {
              testnetwork: {
                network_id: networkId
              }
            },
            network: "testnetwork",
            sourceFetchers: [fetcherName]
          });
          return [4 /*yield*/, (0, index_1.fetchAndCompile)(address, config)];
        case 1:
          result = _a.sent();
          chai_1.assert.equal(result.fetchedVia, fetcherName);
          contractNameFromSourceInfo = result.sourceInfo.contractName;
          chai_1.assert.equal(contractNameFromSourceInfo, expectedName);
          contractsFromCompilation =
            result.compileResult.compilations[0].contracts;
          (0, chai_1.assert)(
            contractsFromCompilation.some(function (contract) {
              return contract.contractName === expectedName;
            })
          );
          (0, chai_1.assert)(
            result.compileResult.contracts.some(function (contract) {
              return contract.contractName === expectedName;
            })
          );
          return [2 /*return*/];
      }
    });
  });
}
