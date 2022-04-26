import Config from "@truffle/config";
import type { FetchAndCompileOptions } from "./types";
import Fetchers from "@truffle/source-fetcher";

export function normalizeFetchAndCompileOptions(
  options: FetchAndCompileOptions | Config
): FetchAndCompileOptions {
  if (options instanceof Config) {
    let normalizedOptions: FetchAndCompileOptions = {
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
    for (const fetcher of Fetchers) {
      const fetcherName = fetcher.fetcherName;
      const fetcherOptions = options[fetcherName];
      //@ts-ignore TS can't recognize that the objects we just set up are definitely not undefined :-/
      normalizedOptions.fetch.fetcherOptions[fetcherName] = fetcherOptions;
    }
    return normalizedOptions;
  } else {
    return options;
  }
}

export function normalizeFetcherNames(
  optionsOrFetcherNames?: FetchAndCompileOptions | Config | string[]
): string[] | undefined {
  if (Array.isArray(optionsOrFetcherNames)) {
    return optionsOrFetcherNames;
  } else if (!optionsOrFetcherNames) {
    return optionsOrFetcherNames;
  } else {
    const options = normalizeFetchAndCompileOptions(optionsOrFetcherNames);
    return ((options || {}).fetch || {}).precedence;
  }
}
