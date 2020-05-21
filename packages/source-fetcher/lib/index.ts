import "source-map-support/register";

import { Fetcher, FetcherConstructor } from "./types";
export { Fetcher, FetcherConstructor };

import EtherscanFetcher from "./etherscan";

const Fetchers: FetcherConstructor[] = [EtherscanFetcher];

export default Fetchers;
