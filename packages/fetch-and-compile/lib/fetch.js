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
exports.getSortedFetcherConstructors = exports.fetchAndCompileForRecognizer =
  void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)("fetch-and-compile:fetch");
var semver_1 = require("semver");
var source_fetcher_1 = require("@truffle/source-fetcher");
var source_fetcher_2 = require("@truffle/source-fetcher");
var config_1 = require("@truffle/config");
var Compile = require("@truffle/compile-solidity").Compile; //sorry for untyped import!
var utils_1 = require("./utils");
function fetchAndCompileForRecognizer(recognizer, options) {
  return __awaiter(this, void 0, void 0, function () {
    var normalizedOptions, fetcherConstructors, fetchers, address;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          normalizedOptions = (0, utils_1.normalizeFetchAndCompileOptions)(
            options
          );
          fetcherConstructors = getSortedFetcherConstructors(
            (0, utils_1.normalizeFetcherNames)(normalizedOptions)
          );
          return [
            4 /*yield*/,
            getFetchers(fetcherConstructors, normalizedOptions, recognizer)
          ];
        case 1:
          fetchers = _a.sent();
          _a.label = 2;
        case 2:
          if (
            !((address = recognizer.getAnUnrecognizedAddress()) !== undefined)
          )
            return [3 /*break*/, 4];
          return [
            4 /*yield*/,
            tryFetchAndCompileAddress(
              address,
              fetchers,
              recognizer,
              normalizedOptions
            )
          ];
        case 3:
          _a.sent();
          return [3 /*break*/, 2];
        case 4:
          return [2 /*return*/];
      }
    });
  });
}
exports.fetchAndCompileForRecognizer = fetchAndCompileForRecognizer;
//sort/filter fetchers by user's order, if given; otherwise use default order
function getSortedFetcherConstructors(userFetcherNames) {
  var sortedFetchers = [];
  if (userFetcherNames) {
    var _loop_1 = function (name_1) {
      var Fetcher = source_fetcher_1.default.find(function (Fetcher) {
        return Fetcher.fetcherName === name_1;
      });
      if (Fetcher) {
        sortedFetchers.push(Fetcher);
      } else {
        throw new Error("Unknown external source service ".concat(name_1, "."));
      }
    };
    for (
      var _i = 0, userFetcherNames_1 = userFetcherNames;
      _i < userFetcherNames_1.length;
      _i++
    ) {
      var name_1 = userFetcherNames_1[_i];
      _loop_1(name_1);
    }
  } else {
    sortedFetchers = source_fetcher_1.default;
  }
  return sortedFetchers;
}
exports.getSortedFetcherConstructors = getSortedFetcherConstructors;
function getFetchers(fetcherConstructors, options, recognizer) {
  return __awaiter(this, void 0, void 0, function () {
    var networkId;
    var _this = this;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          networkId = options.network.networkId;
          return [
            4 /*yield*/,
            Promise.all(
              fetcherConstructors.map(function (Fetcher) {
                return __awaiter(_this, void 0, void 0, function () {
                  var error_1;
                  return __generator(this, function (_a) {
                    switch (_a.label) {
                      case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [
                          4 /*yield*/,
                          Fetcher.forNetworkId(
                            networkId,
                            ((options.fetch || {}).fetcherOptions || {})[
                              Fetcher.fetcherName
                            ]
                          )
                        ];
                      case 1:
                        return [2 /*return*/, _a.sent()];
                      case 2:
                        error_1 = _a.sent();
                        if (
                          !(
                            error_1 instanceof
                            source_fetcher_2.InvalidNetworkError
                          )
                        ) {
                          //if it's *not* just an invalid network, log the error.
                          recognizer.markBadFetcher(Fetcher.fetcherName);
                        }
                        //either way, filter this fetcher out
                        return [2 /*return*/, null];
                      case 3:
                        return [2 /*return*/];
                    }
                  });
                });
              })
            )
          ];
        case 1:
          //make fetcher instances. we'll filter out ones that don't support this
          //network (and note ones that yielded errors)
          return [
            2 /*return*/,
            _a.sent().filter(function (fetcher) {
              return fetcher !== null;
            })
          ];
      }
    });
  });
}
function tryFetchAndCompileAddress(
  address,
  fetchers,
  recognizer,
  fetchAndCompileOptions
) {
  return __awaiter(this, void 0, void 0, function () {
    var found,
      failureReason,
      failureError,
      _i,
      fetchers_1,
      fetcher,
      result,
      error_2,
      sources,
      options,
      externalConfig,
      compileResult,
      error_3;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          found = false;
          (_i = 0), (fetchers_1 = fetchers);
          _a.label = 1;
        case 1:
          if (!(_i < fetchers_1.length)) return [3 /*break*/, 12];
          fetcher = fetchers_1[_i];
          result = void 0;
          _a.label = 2;
        case 2:
          _a.trys.push([2, 4, , 5]);
          debug("getting sources for %s via %s", address, fetcher.fetcherName);
          return [4 /*yield*/, fetcher.fetchSourcesForAddress(address)];
        case 3:
          result = _a.sent();
          return [3 /*break*/, 5];
        case 4:
          error_2 = _a.sent();
          debug("error in getting sources! %o", error_2);
          failureReason = "fetch";
          failureError = error_2;
          return [3 /*break*/, 11];
        case 5:
          if (result === null) {
            debug("no sources found");
            //null means they don't have that address
            return [3 /*break*/, 11];
          }
          //if we do have it, extract sources & options
          debug("got sources!");
          (sources = result.sources), (options = result.options);
          if (options.language === "Vyper") {
            //if it's not Solidity, bail out now
            debug("found Vyper, bailing out!");
            recognizer.markUnrecognizable(address, "language");
            //break out of the fetcher loop, since *no* fetcher will work here
            return [3 /*break*/, 12];
          }
          externalConfig = config_1.default.default().with({
            compilers: {
              solc: options
            }
          });
          //if using docker, transform it (this does nothing if not using docker)
          externalConfig = transformIfUsingDocker(
            externalConfig,
            fetchAndCompileOptions
          );
          compileResult = void 0;
          _a.label = 6;
        case 6:
          _a.trys.push([6, 8, , 9]);
          return [
            4 /*yield*/,
            Compile.sources({
              options: externalConfig.with({ quiet: true }),
              sources: sources
            })
          ];
        case 7:
          compileResult = _a.sent();
          return [3 /*break*/, 9];
        case 8:
          error_3 = _a.sent();
          debug("compile error: %O", error_3);
          failureReason = "compile";
          failureError = error_3;
          return [3 /*break*/, 11]; //try again with a different fetcher, I guess?
        case 9:
          //add it!
          return [
            4 /*yield*/,
            recognizer.addCompiledInfo(
              {
                compileResult: compileResult,
                sourceInfo: result,
                fetchedVia: fetcher.fetcherName
              },
              address
            )
          ];
        case 10:
          //add it!
          _a.sent();
          failureReason = undefined; //mark as *not* failed in case a previous fetcher failed
          failureError = undefined;
          //check: did this actually help?
          debug("checking result");
          if (!recognizer.isAddressUnrecognized(address)) {
            debug(
              "address %s successfully recognized via %s",
              address,
              fetcher.fetcherName
            );
            found = true;
            //break out of the fetcher loop -- we got what we want
            return [3 /*break*/, 12];
          }
          debug("address %s still unrecognized", address);
          _a.label = 11;
        case 11:
          _i++;
          return [3 /*break*/, 1];
        case 12:
          if (found === false) {
            //if we couldn't find it, add it to the list of addresses to skip
            recognizer.markUnrecognizable(address, failureReason, failureError);
          }
          return [2 /*return*/];
      }
    });
  });
}
function transformIfUsingDocker(externalConfig, fetchAndCompileOptions) {
  var useDocker = Boolean((fetchAndCompileOptions.compile || {}).docker);
  if (!useDocker) {
    //if they're not using docker, no need to transform anything :)
    return externalConfig;
  }
  var givenVersion = externalConfig.compilers.solc.version;
  //if they are, we have to ask: are they using a nightly?
  if (semver_1.default.prerelease(givenVersion)) {
    //we're not going to attempt to make Docker work with nightlies.
    //just keep Docker turned off.
    return externalConfig;
  }
  //otherwise, turn on Docker, and reduce the version to its simple form.
  var simpleVersion = semver_1.default.valid(givenVersion);
  if (simpleVersion === null) {
    //this should never happen
    throw new Error("Fetched source has unparseable compiler version");
  }
  return externalConfig.merge({
    compilers: {
      solc: {
        version: simpleVersion,
        docker: true
      }
    }
  });
}
