import type { Fetcher, FetcherConstructor, SourceInfo } from "./types";
import { InvalidNetworkError } from "./common";
export { Fetcher, FetcherConstructor, InvalidNetworkError, SourceInfo };

import EtherscanFetcher from "./etherscan";
import SourcifyFetcher from "./sourcify";

const Fetchers: FetcherConstructor[] = [EtherscanFetcher, SourcifyFetcher];

export default Fetchers;
