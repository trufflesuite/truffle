import debugModule from "debug";
const debug = debugModule("source-fetcher:blockscout");

import type { Fetcher, FetcherConstructor } from "./types";
import type * as Types from "./types";
import {
  makeFilename,
  makeTimer,
  removeLibraries,
  InvalidNetworkError
} from "./common";
import { networkNamesById, networksByName } from "./networks";

// must polyfill AbortController to use axios >=0.20.0, <=0.27.2 on node <= v14.x
import "./polyfill";
import axios from "axios";

import retry from "async-retry";

//this looks awkward but the TS docs actually suggest this :P
const BlockscoutFetcher: FetcherConstructor = class BlockscoutFetcher
  implements Fetcher
{
  static get fetcherName(): string {
    return "blockscout";
  }
  get fetcherName(): string {
    return BlockscoutFetcher.fetcherName;
  }

  static async forNetworkId(
    id: number,
    options?: Types.FetcherOptions
  ): Promise<BlockscoutFetcher> {
    return new BlockscoutFetcher(id, options ? options.apiKey : "");
  }

  private readonly networkName: string;

  private readonly apiKey: string;
  private readonly delay: number; //minimum # of ms to wait between requests

  private ready: Promise<void>; //always await this timer before making a request.
  //then, afterwards, start a new timer.

  private static readonly apiDomainsByNetworkName: { [name: string]: string } =
    {
      "mainnet": "eth.blockscout.com",
      "goerli": "eth-goerli.blockscout.com",
      //I'm not including Ethereum Classic Mainnet as it has chain ID != network ID
      //not including Mordor for same reason
      "kotti-etc": "blockscout.com/etc/kotti", //Kotti, however, is fine
      "gnosis": "blockscout.com/xdai/mainnet",
      "chiado-gnosis": "blockscout.com/gnosis/chiado",
      "astar": "blockscout.com/astar",
      "shiden-astar": "blockscout.com/shiden",
      "optimistic": "blockscout.com/optimism/mainnet",
      "goerli-optimistic": "blockscout.com/optimism/goerli",
      "core-poa": "blockscout.com/poa/core",
      "core-sokol": "blockscout.com/poa/sokol",
      "sigma1-artis": "blockscout.com/artis/sigma1",
      "rsk": "blockscout.com/rsk/mainnet"
      //networks I excluded due to lack of good information about them:
      //optimism bedrock beta (not goerli, that's alpha); optimism opcraft
      //networks I excluded due to chain IDs conflicting with what's
      //on chainlist.org or sourcify's chains.json:
      //polkadot/astar's shibuya network; LUKSO L14
    };

  constructor(networkId: number, apiKey: string = "") {
    const networkName = networkNamesById[networkId];
    if (
      networkName === undefined ||
      !(networkName in BlockscoutFetcher.apiDomainsByNetworkName)
    ) {
      throw new InvalidNetworkError(networkId, "blockscout");
    }
    this.networkName = networkName;
    this.apiKey = apiKey;
    const baseDelay = 20; //blockscout allows 50 requests per second
    const safetyFactor = 1; //no safety factor atm
    this.delay = baseDelay * safetyFactor;
    this.ready = makeTimer(0); //at start, it's ready to go immediately
  }

  static getSupportedNetworks(): Types.SupportedNetworks {
    return Object.fromEntries(
      Object.entries(networksByName).filter(
        ([name, _]) => name in BlockscoutFetcher.apiDomainsByNetworkName
      )
    );
  }

  async fetchSourcesForAddress(
    address: string
  ): Promise<Types.SourceInfo | null> {
    const response = await this.getSuccessfulResponse(address);
    return BlockscoutFetcher.processResult(response.result[0]);
  }

  private async getSuccessfulResponse(
    address: string
  ): Promise<BlockscoutSuccess> {
    const initialTimeoutFactor = 1.5; //I guess?
    return await retry(async () => await this.makeRequest(address), {
      retries: 3,
      minTimeout: this.delay * initialTimeoutFactor
    });
  }

  private determineUrl() {
    const domain = BlockscoutFetcher.apiDomainsByNetworkName[this.networkName];
    return `https://${domain}/api`;
  }

  private async makeRequest(address: string): Promise<BlockscoutSuccess> {
    //not putting a try/catch around this; if it throws, we throw
    await this.ready;
    const responsePromise = axios.get(this.determineUrl(), {
      params: {
        module: "contract",
        action: "getsourcecode",
        address,
        apikey: this.apiKey
      },
      responseType: "json",
      maxRedirects: 50
    });
    this.ready = makeTimer(this.delay);
    const response: BlockscoutResponse = (await responsePromise).data;
    if (response.status === "0") {
      throw new Error(response.result);
    }
    return response;
  }

  private static processResult(
    result: BlockscoutResult
  ): Types.SourceInfo | null {
    //case 1: the address isn't verified
    if (result.SourceCode === undefined) {
      return null;
    }
    const language: "Yul" | "Solidity" | "Vyper" =
      result.ABI === "null"
        ? "Yul"
        : result.ContractName === "Vyper_contract"
        ? "Vyper"
        : "Solidity";
    if (language === "Vyper") {
      return {
        contractName: result.ContractName,
        sources: this.processSources(result, "Vyper"),
        options: {
          language,
          version: result.CompilerVersion,
          settings: this.extractVyperSettings(result),
          specializations: {
            constructorArguments: result.ConstructorArguments
          }
        }
      };
    } else {
      //Solidity and Yul
      return {
        contractName: result.ContractName,
        sources: this.processSources(result, language),
        options: {
          language,
          version: result.CompilerVersion,
          settings: this.extractSettings(result),
          specializations: {
            libraries: this.processLibraries(result),
            constructorArguments: result.ConstructorArguments
          }
        }
      };
    }
  }

  private static processLibraries(
    result: BlockscoutResult
  ): Types.LibrarySettings {
    if (result.CompilerSettings) {
      return result.CompilerSettings.libraries;
    }
    return {
      //the empty string key indicates that these libraries apply to all sources
      "": Object.assign(
        {},
        ...(result.ExternalLibraries || []).map(({ address_hash, name }) => ({
          [name]: address_hash //should already be checksummed
        }))
      )
    };
  }

  private static processSources(
    result: BlockscoutResult,
    language: "Solidity" | "Vyper" | "Yul"
  ): Types.SourcesByPath {
    const suffix = { Solidity: ".sol", Vyper: ".vy", Yul: ".yul" }[language];
    const mainFileName =
      result.FileName || makeFilename(result.ContractName, suffix);
    return Object.assign(
      { [mainFileName]: result.SourceCode },
      ...(result.AdditionalSources || []).map(({ Filename, SourceCode }) => ({
        [Filename]: SourceCode
      }))
    );
  }

  private static extractSettings(result: BlockscoutResult): Types.SolcSettings {
    if (result.CompilerSettings) {
      return removeLibraries(result.CompilerSettings, {
        alsoRemoveOutputSelection: true,
        alsoRemoveCompilationTarget: true
      });
    }
    const evmVersion: string =
      result.EVMVersion === "default" ? undefined : result.EVMVersion;
    const optimizer =
      result.OptimizationRuns != null //deliberate !=
        ? {
            enabled: result.OptimizationUsed === "true",
            runs: result.OptimizationRuns
          }
        : { enabled: result.OptimizationUsed === "true" };
    if (evmVersion) {
      return {
        optimizer,
        evmVersion
      };
    } else {
      return {
        optimizer
      };
    }
  }

  private static extractVyperSettings(
    result: BlockscoutResult
  ): Types.VyperSettings {
    const evmVersion: string =
      result.EVMVersion === "default" ? undefined : result.EVMVersion;
    //just as in the Etherscan fetcher, we want to ignore the optimization settings
    //for Vyper, because Blockscout doesn't support them properly (see comment there,
    //it works the same here)
    if (evmVersion) {
      return { evmVersion };
    } else {
      return {};
    }
  }
};

type BlockscoutResponse = BlockscoutSuccess | BlockscoutFailure;

interface BlockscoutSuccess {
  status: "1";
  message: string;
  result: BlockscoutResult[];
}

interface BlockscoutFailure {
  status: "0";
  message: string;
  result: null;
}

//apologies for parts of this being stringly-typed, but that's how
//Blockscout does it
interface BlockscoutResult {
  Address: string; //not checksummed
  SourceCode: string;
  AdditionalSources?: BlockscoutAdditionalSource[];
  ABI: string; //really: it's the ABI, but could also be "null" (for Yul) or a not verified message
  CompilerVersion: string;
  ConstructorArguments?: string; //encoded as hex string, no 0x in front; excluded if empty
  ContractName: string;
  EVMVersion: string | null; //may be "default"
  ExternalLibraries?: BlockscoutLibrary[];
  FileName: string; //yes, that's FileName, *not* Filename
  OptimizationUsed: "true" | "false";
  OptimizationRuns?: number | null; //excluded if optimization not used
  CompilerSettings?: Types.SolcSettings;
  //we don't care about any of the following
  IsProxy: "true" | "false";
  ImplementationAddress?: string; //only included if IsProxy is "true"
}

interface BlockscoutLibrary {
  address_hash: string; //the address; checksummed
  name: string;
}

interface BlockscoutAdditionalSource {
  Filename: string; //yes, that's Filename, *not* FileName
  SourceCode: string;
}

export default BlockscoutFetcher;
