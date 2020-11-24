import debugModule from "debug";
const debug = debugModule("source-fetcher:sourcify");

import {Fetcher, FetcherConstructor} from "./types";
import * as Types from "./types";
import {networksById, removeLibraries, InvalidNetworkError} from "./common";
import request from "request-promise-native";

//this looks awkward but the TS docs actually suggest this :P
const SourcifyFetcher: FetcherConstructor = class SourcifyFetcher
  implements Fetcher {
  get fetcherName(): string {
    return "sourcify";
  }
  static get fetcherName(): string {
    return "sourcify";
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

  private readonly domain: string = "contractrepo.komputing.org";

  constructor(networkId: number) {
    this.networkId = networkId;
    this.networkName = networksById[networkId];
    const supportedNetworks = [
      "mainnet",
      "ropsten",
      "kovan",
      "rinkeby",
      "goerli"
    ];
    if (
      this.networkName === undefined ||
      !supportedNetworks.includes(this.networkName)
    ) {
      throw new InvalidNetworkError(networkId);
    }
  }

  async fetchSourcesForAddress(
    address: string
  ): Promise<Types.SourceInfo | null> {
    const metadata = await this.getMetadata(address);
    if (!metadata) {
      return null;
    }
    let sources: Types.SourcesByPath;
    if (metadata.language === "Solidity") {
      sources = Object.assign(
        {},
        ...(await Promise.all(
          Object.entries(metadata.sources).map(
            async ([sourcePath, {content: source}]) => ({
              [sourcePath]:
                source !== undefined
                  ? source //sourcify doesn't support this yet but they're planning it
                  : await this.getSource(address, sourcePath)
            })
          )
        ))
      );
    } else {
      //don't bother attempting to fetch sources if it's Yul
      sources = {};
    }
    return {
      sources,
      options: {
        language: metadata.language,
        version: metadata.compiler.version,
        settings: removeLibraries(metadata.settings)
      }
    };
  }

  private async getMetadata(
    address: string
  ): Promise<Types.SolcMetadata | null> {
    try {
      return await this.requestWithRetries<Types.SolcMetadata>({
        uri: `https://${this.domain}/contract/${this.networkId}/${address}/metadata.json`,
        json: true //turns on auto-parsing
      });
    } catch (error) {
      //is this a 404 error? if so just return null
      if (error.statusCode === 404) {
        return null;
      }
      //otherwise, we've got a problem; rethrow the error
      throw error;
    }
  }

  private async getSource(
    address: string,
    sourcePath: string
  ): Promise<string> {
    return await this.requestWithRetries<string>({
      uri: `https://${this.domain}/contract/${this.networkId}/${address}/sources/${sourcePath}`
    });
  }

  private async requestWithRetries<T>(
    requestObject: any //sorry, trying to import the type properly ran into problems
  ): Promise<T> {
    const allowedAttempts = 2; //for now, we'll just retry once if it fails
    let lastError;
    for (let attempt = 0; attempt < allowedAttempts; attempt++) {
      const responsePromise = request(requestObject);
      try {
        return await responsePromise;
      } catch (error) {
        //check: is this a 404 error? if so give up
        if (error.statusCode === 404) {
          throw error;
        }
        //otherwise, just go back to the top of the loop to retry
        lastError = error;
      }
    }
    //if we've made it this far with no successful response, just
    //throw the last error
    throw lastError;
  }
};

export default SourcifyFetcher;
