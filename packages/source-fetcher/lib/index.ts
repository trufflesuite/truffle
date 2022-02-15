import type {
  Fetcher,
  FetcherConstructor,
  SourceInfo,
  NetworkInfo
} from "./types";
import { InvalidNetworkError } from "./common";
export {
  Fetcher,
  FetcherConstructor,
  InvalidNetworkError,
  SourceInfo,
  NetworkInfo
};

import EtherscanFetcher from "./etherscan";
import SourcifyFetcher from "./sourcify";

const Fetchers: FetcherConstructor[] = [EtherscanFetcher, SourcifyFetcher];

export default Fetchers;
