"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFetcherNames = exports.normalizeFetchAndCompileOptions =
  void 0;
var config_1 = require("@truffle/config");
var source_fetcher_1 = require("@truffle/source-fetcher");
function normalizeFetchAndCompileOptions(options) {
  if (options instanceof config_1.default) {
    var normalizedOptions = {
      network: {
        networkId: options.network_id
      },
      compile: {
        docker: ((options.compilers || {}).solc || {}).docker
      },
      fetch: {
        precedence: options.sourceFetchers,
        fetcherOptions: {}
      }
    };
    for (
      var _i = 0, Fetchers_1 = source_fetcher_1.default;
      _i < Fetchers_1.length;
      _i++
    ) {
      var fetcher = Fetchers_1[_i];
      var fetcherName = fetcher.fetcherName;
      var fetcherOptions = options[fetcherName];
      //@ts-ignore TS can't recognize that the objects we just set up are definitely not undefined :-/
      normalizedOptions.fetch.fetcherOptions[fetcherName] = fetcherOptions;
    }
    return normalizedOptions;
  } else {
    return options;
  }
}
exports.normalizeFetchAndCompileOptions = normalizeFetchAndCompileOptions;
function normalizeFetcherNames(optionsOrFetcherNames) {
  if (Array.isArray(optionsOrFetcherNames)) {
    return optionsOrFetcherNames;
  } else if (!optionsOrFetcherNames) {
    return optionsOrFetcherNames;
  } else {
    var options = normalizeFetchAndCompileOptions(optionsOrFetcherNames);
    return ((options || {}).fetch || {}).precedence;
  }
}
exports.normalizeFetcherNames = normalizeFetcherNames;
