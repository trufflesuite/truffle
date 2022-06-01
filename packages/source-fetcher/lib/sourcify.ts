import debugModule from "debug";
const debug = debugModule("source-fetcher:sourcify");

import type { Fetcher, FetcherConstructor } from "./types";
import type * as Types from "./types";
import { removeLibraries, InvalidNetworkError } from "./common";
import { networkNamesById, networksByName } from "./networks";
import axios from "axios";
import retry from "async-retry";

//this looks awkward but the TS docs actually suggest this :P
const SourcifyFetcher: FetcherConstructor = class SourcifyFetcher
  implements Fetcher
{
  static get fetcherName(): string {
    return "sourcify";
  }
  get fetcherName(): string {
    return SourcifyFetcher.fetcherName;
  }

  static async forNetworkId(
    id: number,
    _options?: Types.FetcherOptions
  ): Promise<SourcifyFetcher> {
    //in the future, we may add protocol and node options,
    //but these don't exist yet
    return new SourcifyFetcher(id);
  }

  private readonly networkId: number;
  private readonly networkName: string; //not really used as a class member atm
  //but may be in the future

  private readonly domain: string = "repo.sourcify.dev";

  private static readonly supportedNetworks = new Set([
    "mainnet",
    "ropsten",
    "kovan",
    "rinkeby",
    "goerli",
    "kovan",
    "sepolia",
    "optimistic",
    "kovan-optimistic",
    "arbitrum",
    "rinkeby-arbitrum",
    "polygon",
    "mumbai-polygon",
    "xdai",
    //sourcify does *not* support poa core...?
    "sokol-poa",
    "binance",
    "testnet-binance",
    "celo",
    "alfajores-celo",
    "baklava-celo",
    "avalanche",
    "fuji-avalanche",
    "wagmi-avalanche",
    //sourcify does *not* support non-testnet dfk?
    "testnet-dfk-avalanche",
    "telos",
    "testnet-telos",
    "ubiq",
    "oneledger",
    "frankenstein-oneledger",
    "syscoin",
    "tanenbaum-syscoin",
    "boba",
    "rinkeby-boba",
    "velas",
    "meter",
    "testnet-meter",
    "aurora",
    "testnet-aurora",
    "fuse",
    "moonbeam",
    "moonriver",
    "moonbase-alpha",
    "palm",
    "testnet-palm",
    "crab-darwinia",
    "pangolin-darwinia",
    "evmos",
    "testnet-evmos",
    "multivac",
    "candle",
    "gather",
    "devnet-gather",
    "testnet-gather"
  ]);

  constructor(networkId: number) {
    this.networkId = networkId;
    this.networkName = networkNamesById[networkId];
    if (
      this.networkName === undefined ||
      !SourcifyFetcher.supportedNetworks.has(this.networkName)
    ) {
      throw new InvalidNetworkError(networkId, "sourcify");
    }
  }

  static getSupportedNetworks(): Types.SupportedNetworks {
    return Object.fromEntries(
      Object.entries(networksByName).filter(([name, _]) =>
        SourcifyFetcher.supportedNetworks.has(name)
      )
    );
  }

  async fetchSourcesForAddress(
    address: string
  ): Promise<Types.SourceInfo | null> {
    let result = await this.fetchSourcesForAddressAndMatchType(address, "full");
    if (!result) {
      //if we got nothing when trying a full match, try for a partial match
      result = await this.fetchSourcesForAddressAndMatchType(
        address,
        "partial"
      );
    }
    //if partial match also fails, just return null
    return result;
  }

  private async fetchSourcesForAddressAndMatchType(
    address: string,
    matchType: "full" | "partial"
  ): Promise<Types.SourceInfo | null> {
    const metadata = await this.getMetadata(address, matchType);
    debug("metadata: %O", metadata);
    if (!metadata) {
      debug("no metadata");
      return null;
    }
    let sources: Types.SourcesByPath;
    sources = Object.assign(
      {},
      ...(await Promise.all(
        Object.entries(metadata.sources).map(
          async ([sourcePath, { content: source }]) => ({
            [sourcePath]:
              source !== undefined
                ? source //sourcify doesn't support this yet but they're planning it
                : await this.getSource(address, sourcePath, matchType)
          })
        )
      ))
    );
    const constructorArguments = await this.getConstructorArgs(
      address,
      matchType
    );
    debug("compilationTarget: %O", metadata.settings.compilationTarget);
    return {
      contractName: Object.values(metadata.settings.compilationTarget)[0],
      sources,
      options: {
        language: metadata.language,
        version: metadata.compiler.version,
        //we also pass the flag to remove compilationTarget, as its
        //presence can cause compile errors
        settings: removeLibraries(metadata.settings, true),
        specializations: {
          constructorArguments,
          libraries: metadata.settings.libraries
        }
      }
    };
  }

  private async getMetadata(
    address: string,
    matchType: "full" | "partial"
  ): Promise<Types.SolcMetadata | null> {
    try {
      return await this.requestWithRetries<Types.SolcMetadata>({
        url: `https://${this.domain}/contracts/${matchType}_match/${this.networkId}/${address}/metadata.json`,
        method: "get",
        responseType: "json",
        maxRedirects: 50
      });
    } catch (error) {
      //is this a 404 error? if so just return null
      debug("error: %O", error);
      if (error.response && error.response.status === 404) {
        return null;
      }
      //otherwise, we've got a problem; rethrow the error
      throw error;
    }
  }

  private async getSource(
    address: string,
    sourcePath: string,
    matchType: "full" | "partial"
  ): Promise<string> {
    //note: sourcify replaces special characters in paths with underscores
    //(special characters here being anything other than ASCII alphanumerics,
    //hyphens, periods, and forward slashes)
    const transformedSourcePath = sourcePath.replace(/[^\w.\/-]/gu, "_");
    return await this.requestWithRetries<string>({
      url: `https://${this.domain}/contracts/${matchType}_match/${this.networkId}/${address}/sources/${transformedSourcePath}`,
      responseType: "text",
      method: "get",
      maxRedirects: 50
    });
  }

  private async getConstructorArgs(
    address: string,
    matchType: "full" | "partial"
  ): Promise<string | undefined> {
    try {
      const constructorArgs = await this.requestWithRetries<string>({
        url: `https://${this.domain}/contracts/${matchType}_match/${this.networkId}/${address}/constructor-args.txt`,
        method: "get",
        responseType: "text",
        maxRedirects: 50
      });
      return constructorArgs.slice(2); //remove initial "0x"
    } catch (error) {
      //is this a 404 error? if so just return undefined
      debug("error: %O", error);
      if (error.response && error.response.status === 404) {
        return undefined;
      }
      //otherwise, we've got a problem; rethrow the error
      throw error;
    }
  }

  private async requestWithRetries<T>(
    requestObject: any //sorry, trying to import the type properly ran into problems
  ): Promise<T> {
    return await retry(
      async bail => {
        try {
          //note: we use axios.request rather than just axios so we can stub it in tests!
          return (await axios.request(requestObject)).data;
        } catch (error) {
          //check: is this a 404 error? if so give up
          if (error.response && error.response.status === 404) {
            bail(error); //don't retry
          } else {
            throw error; //retry
          }
        }
      },
      { retries: 3 } //leaving minTimeout as default 1000
    );
  }
};

export default SourcifyFetcher;
