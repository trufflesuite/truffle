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
exports.DebugRecognizer = void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)("fetch-and-compile:debug");
var Codec = require("@truffle/codec");
var DebugRecognizer = /** @class */ (function () {
  function DebugRecognizer(bugger) {
    this.addressesToSkip = new Set();
    this.badFetchAddresses = [];
    this.badCompileAddresses = [];
    this.badFetchers = [];
    this.bugger = bugger; //no clone, note!
  }
  DebugRecognizer.prototype.getErrors = function () {
    return {
      fetch: this.badFetchAddresses,
      compile: this.badCompileAddresses,
      fetchers: this.badFetchers
    };
  };
  //helper method
  DebugRecognizer.prototype.getUnrecognizedAddresses = function () {
    debug("getting unknown addresses");
    var instances = this.bugger.view(
      this.bugger.selectors.session.info.affectedInstances
    );
    debug("got instances");
    return Object.entries(instances)
      .filter(function (_a) {
        var _ = _a[0],
          contractName = _a[1].contractName;
        return contractName === undefined;
      })
      .map(function (_a) {
        var address = _a[0],
          _ = _a[1];
        return address;
      });
  };
  /*
   * Interface methods follow
   */
  DebugRecognizer.prototype.isAddressUnrecognized = function (address) {
    return this.getUnrecognizedAddresses().includes(address);
  };
  DebugRecognizer.prototype.getAnUnrecognizedAddress = function () {
    var _this = this;
    return this.getUnrecognizedAddresses().find(function (address) {
      return !_this.addressesToSkip.has(address);
    });
  };
  DebugRecognizer.prototype.markUnrecognizable = function (address, reason) {
    //debugger does not keep track of detailed errors
    if (reason) {
      switch (reason) {
        case "fetch":
          this.badFetchAddresses.push(address);
          break;
        case "compile":
          this.badCompileAddresses.push(address);
          break;
        default:
          //just ignore ones with unsupported language
          break;
      }
    }
    this.addressesToSkip.add(address);
  };
  DebugRecognizer.prototype.markBadFetcher = function (fetcherName) {
    this.badFetchers.push(fetcherName);
  };
  DebugRecognizer.prototype.addCompiledInfo = function (info, address) {
    return __awaiter(this, void 0, void 0, function () {
      var compilations, shimmedCompilations;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            debug("compileResult: %O", info.compileResult);
            compilations = info.compileResult.compilations;
            shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
              compilations,
              "externalFor("
                .concat(address, ")Via(")
                .concat(info.fetchedVia, ")")
            );
            return [
              4 /*yield*/,
              this.bugger.addExternalCompilations(shimmedCompilations)
            ];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  };
  return DebugRecognizer;
})();
exports.DebugRecognizer = DebugRecognizer;
