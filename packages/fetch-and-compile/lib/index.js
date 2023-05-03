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
exports.getSupportedNetworks =
  exports.fetchAndCompileForDebugger =
  exports.fetchAndCompileMultiple =
  exports.fetchAndCompile =
  exports.fetchAndCompileForRecognizer =
    void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)("fetch-and-compile");
var recognizer_1 = require("./recognizer");
var multiple_1 = require("./multiple");
var debug_2 = require("./debug");
var fetch_1 = require("./fetch");
Object.defineProperty(exports, "fetchAndCompileForRecognizer", {
  enumerable: true,
  get: function () {
    return fetch_1.fetchAndCompileForRecognizer;
  }
});
var utils_1 = require("./utils");
function fetchAndCompile(address, options) {
  return __awaiter(this, void 0, void 0, function () {
    var normalizedOptions, recognizer;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          normalizedOptions = (0, utils_1.normalizeFetchAndCompileOptions)(
            options
          );
          recognizer = new recognizer_1.SingleRecognizer(address);
          return [
            4 /*yield*/,
            (0, fetch_1.fetchAndCompileForRecognizer)(
              recognizer,
              normalizedOptions
            )
          ];
        case 1:
          _a.sent();
          return [2 /*return*/, recognizer.getResult()];
      }
    });
  });
}
exports.fetchAndCompile = fetchAndCompile;
/**
 * warning: while this function deduplicates inputs,
 * it does *not* make any further effort to avoid redundant
 * fetches (e.g. if multiple addresses share the same source),
 * unlike fetchAndCompileForDebugger
 */
function fetchAndCompileMultiple(addresses, options) {
  return __awaiter(this, void 0, void 0, function () {
    var normalizedOptions, recognizer;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          normalizedOptions = (0, utils_1.normalizeFetchAndCompileOptions)(
            options
          );
          recognizer = new multiple_1.MultipleRecognizer(addresses);
          return [
            4 /*yield*/,
            (0, fetch_1.fetchAndCompileForRecognizer)(
              recognizer,
              normalizedOptions
            )
          ];
        case 1:
          _a.sent();
          return [2 /*return*/, recognizer.getResults()];
      }
    });
  });
}
exports.fetchAndCompileMultiple = fetchAndCompileMultiple;
//note: this function is called primarily for its side-effects
//(i.e. adding compilations to the debugger), NOT its return value!
function fetchAndCompileForDebugger(
  bugger, //sorry; this should be a debugger object
  options
) {
  return __awaiter(this, void 0, void 0, function () {
    var normalizedOptions, recognizer;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          normalizedOptions = (0, utils_1.normalizeFetchAndCompileOptions)(
            options
          );
          recognizer = new debug_2.DebugRecognizer(bugger);
          return [
            4 /*yield*/,
            (0, fetch_1.fetchAndCompileForRecognizer)(
              recognizer,
              normalizedOptions
            )
          ];
        case 1:
          _a.sent();
          return [2 /*return*/, recognizer.getErrors()];
      }
    });
  });
}
exports.fetchAndCompileForDebugger = fetchAndCompileForDebugger;
function getSupportedNetworks(optionsOrFetcherNames) {
  var fetcherNames = (0, utils_1.normalizeFetcherNames)(optionsOrFetcherNames);
  var fetchers = (0, fetch_1.getSortedFetcherConstructors)(fetcherNames);
  //strictly speaking these are fetcher constructors, but since we
  //won't be using fetcher instances in this function, I'm not going
  //to worry about the difference
  var supportedNetworks = {};
  for (var _i = 0, fetchers_1 = fetchers; _i < fetchers_1.length; _i++) {
    var fetcher = fetchers_1[_i];
    var fetcherNetworks = fetcher.getSupportedNetworks();
    for (var name_1 in fetcherNetworks) {
      if (name_1 in supportedNetworks) {
        supportedNetworks[name_1].fetchers.push(fetcher.fetcherName);
      } else {
        supportedNetworks[name_1] = __assign(
          __assign({}, fetcherNetworks[name_1]),
          { fetchers: [fetcher.fetcherName] }
        );
      }
    }
  }
  return supportedNetworks;
}
exports.getSupportedNetworks = getSupportedNetworks;
