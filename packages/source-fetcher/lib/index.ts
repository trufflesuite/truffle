import type {
  Fetcher,
  FetcherConstructor,
  FetcherOptions,
  SourceInfo,
  NetworkInfo
} from "./types";
import { InvalidNetworkError } from "./common";
export {
  Fetcher,
  FetcherConstructor,
  FetcherOptions,
  InvalidNetworkError,
  SourceInfo,
  NetworkInfo
};

import EtherscanFetcher from "./etherscan";
import SourcifyFetcher from "./sourcify";

const Fetchers: FetcherConstructor[] = [EtherscanFetcher, SourcifyFetcher];

export default Fetchers;
