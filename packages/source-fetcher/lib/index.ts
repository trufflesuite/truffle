import "source-map-support/register";

import { Fetcher, FetcherConstructor } from "./types";
export { Fetcher, FetcherConstructor };

import EtherscanFetcher from "./etherscan";
import SourcifyFetcher from "./sourcify";

const Fetchers: FetcherConstructor[] = [EtherscanFetcher, SourcifyFetcher];

export default Fetchers;
