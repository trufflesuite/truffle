import debugModule from "debug";
const debug = debugModule("source-fetcher:etherscan");
// untyped import since no @types/web3-utils exists
const Web3Utils = require("web3-utils");

import type { Fetcher, FetcherConstructor } from "./types";
import type * as Types from "./types";
import {
  networksById,
  makeFilename,
  makeTimer,
  removeLibraries,
  InvalidNetworkError
} from "./common";
import axios from "axios";
import retry from "async-retry";

const etherscanCommentHeader = `/**
 *Submitted for verification at Etherscan.io on 20XX-XX-XX
*/

`; //note we include that final newline

//this looks awkward but the TS docs actually suggest this :P
const EtherscanFetcher: FetcherConstructor = class EtherscanFetcher
  implements Fetcher {
  get fetcherName(): string {
    return "etherscan";
  }
  static get fetcherName(): string {
    return "etherscan";
  }

  static async forNetworkId(
    id: number,
    options?: Types.FetcherOptions
  ): Promise<EtherscanFetcher> {
    debug("options: %O", options);
    return new EtherscanFetcher(id, options ? options.apiKey : "");
  }

  private readonly apiKey: string;
  private readonly delay: number; //minimum # of ms to wait between requests

  private ready: Promise<void>; //always await this timer before making a request.
  //then, afterwards, start a new timer.

  constructor(networkId: number, apiKey: string = "") {
    const networkName = networksById[networkId];
    const supportedNetworks = [
      "mainnet",
      "ropsten",
      "kovan",
      "rinkeby",
      "goerli",
      "optimistic",
      "kovan-optimistic",
      "arbitrum",
      "polygon"
    ];
    if (networkName === undefined || !supportedNetworks.includes(networkName)) {
      throw new InvalidNetworkError(networkId, "etherscan");
    }
    this.suffix = networkName === "" ? "mainnet" : `${networkName}`;
    debug("apiKey: %s", apiKey);
    this.apiKey = apiKey;
    const baseDelay = this.apiKey ? 200 : 3000; //etherscan permits 5 requests/sec w/a key, 1/3sec w/o
    const safetyFactor = 1; //no safety factor atm
    this.delay = baseDelay * safetyFactor;
    this.ready = makeTimer(0); //at start, it's ready to go immediately
  }

  private readonly suffix: string;

  async fetchSourcesForAddress(
    address: string
  ): Promise<Types.SourceInfo | null> {
    const response = await this.getSuccessfulResponse(address);
    return EtherscanFetcher.processResult(response.result[0]);
  }

  private async getSuccessfulResponse(
    address: string
  ): Promise<EtherscanSuccess> {
    const initialTimeoutFactor = 1.5; //I guess?
    return await retry(
      async () => await this.makeRequest(address),
      { retries: 3, minTimeout: this.delay * initialTimeoutFactor }
    );
  }

  private async makeRequest(address: string): Promise<EtherscanSuccess> {
    //not putting a try/catch around this; if it throws, we throw
    await this.ready;
    let url = '';
    switch (this.suffix){
      case "arbitrum" :
        url = "https://api.arbiscan.io/api";
        break;
      case "polygon" :
        url = "https://api.polygonscan.com/api";
        break;
      case "mainnet":
        url = "https://api.etherscan.io/api"
      default:
        `https://api${this.suffix}.etherscan.io/api`;
        break;
    }
    console.log(url)
    const responsePromise = axios.get(
      url,
      {
        params: {
          module: "contract",
          action: "getsourcecode",
          address,
          apikey: this.apiKey
        },
        responseType: "json",
        maxRedirects: 50
      }
    );
    this.ready = makeTimer(this.delay);
    const response: EtherscanResponse = (await responsePromise).data;
    if (response.status === "0") {
      throw new Error(response.result);
    }
    return response;
  }

  private static processResult(
    result: EtherscanResult
  ): Types.SourceInfo | null {
    //we have 5 cases here.
    //case 1: the address doesn't exist
    if (
      result.SourceCode === "" &&
      result.ABI === "Contract source code not verified"
    ) {
      return null;
    }
    //case 2: it's a Vyper contract
    if (result.CompilerVersion.startsWith("vyper:")) {
      return this.processVyperResult(result);
    }
    let multifileJson: Types.SolcSources;
    try {
      //try to parse the source JSON.  if it succeeds,
      //we're in the multi-file case.
      multifileJson = JSON.parse(result.SourceCode);
    } catch (_) {
      //otherwise, we could be single-file or we could be full JSON.
      //for full JSON input, etherscan will stick an extra pair of braces around it
      if (
        result.SourceCode.startsWith("{") &&
        result.SourceCode.endsWith("}")
      ) {
        const trimmedSource = result.SourceCode.slice(1).slice(0, -1); //remove braces
        let fullJson: Types.SolcInput;
        try {
          fullJson = JSON.parse(trimmedSource);
        } catch (_) {
          //if it still doesn't parse, it's single-source I guess?
          //(note: we shouldn't really end up here?)
          debug("single-file input??");
          return this.processSingleResult(result);
        }
        //case 5: full JSON input
        debug("json input");
        return this.processJsonResult(result, fullJson);
      }
      //case 3 (the way it should happen): single source
      debug("single-file input");
      return this.processSingleResult(result);
    }
    //case 4: multiple sources
    debug("multi-file input");
    return this.processMultiResult(result, multifileJson);
  }

  private static processSingleResult(
    result: EtherscanResult
  ): Types.SourceInfo {
    const filename = makeFilename(result.ContractName);
    return {
      contractName: result.ContractName,
      sources: {
        //we prepend this header comment so that line numbers in the debugger
        //will match up with what's displayed on the website; note that other
        //cases don't display a similar header on the website
        [filename]: etherscanCommentHeader + result.SourceCode
      },
      options: {
        language: "Solidity",
        version: result.CompilerVersion,
        settings: this.extractSettings(result),
        specializations: {
          libraries: this.processLibraries(result.Library),
          constructorArguments: result.ConstructorArguments
        }
      }
    };
  }

  private static processMultiResult(
    result: EtherscanResult,
    sources: Types.SolcSources
  ): Types.SourceInfo {
    return {
      contractName: result.ContractName,
      sources: this.processSources(sources),
      options: {
        language: "Solidity",
        version: result.CompilerVersion,
        settings: this.extractSettings(result),
        specializations: {
          libraries: this.processLibraries(result.Library),
          constructorArguments: result.ConstructorArguments
        }
      }
    };
  }

  private static processJsonResult(
    result: EtherscanResult,
    jsonInput: Types.SolcInput
  ): Types.SourceInfo {
    return {
      contractName: result.ContractName,
      sources: this.processSources(jsonInput.sources),
      options: {
        language: jsonInput.language,
        version: result.CompilerVersion,
        settings: removeLibraries(jsonInput.settings), //we *don't* want to pass library info!  unlinked bytecode is better!
        specializations: {
          libraries: jsonInput.settings.libraries,
          constructorArguments: result.ConstructorArguments
        }
      }
    };
  }

  private static processVyperResult(result: EtherscanResult): Types.SourceInfo {
    const filename = makeFilename(result.ContractName, ".vy");
    //note: this means filename will always be Vyper_contract.vy
    return {
      sources: {
        [filename]: result.SourceCode
      },
      options: {
        language: "Vyper",
        version: result.CompilerVersion.replace(/^vyper:/, ""),
        settings: this.extractVyperSettings(result),
        specializations: {
          constructorArguments: result.ConstructorArguments
        }
      }
    };
  }

  private static processSources(
    sources: Types.SolcSources
  ): Types.SourcesByPath {
    return Object.assign(
      {},
      ...Object.entries(sources).map(([path, { content: source }]) => ({
        [makeFilename(path)]: source
      }))
    );
  }

  private static extractSettings(result: EtherscanResult): Types.SolcSettings {
    const evmVersion: string =
      result.EVMVersion === "Default" ? undefined : result.EVMVersion;
    const optimizer = {
      enabled: result.OptimizationUsed === "1",
      runs: parseInt(result.Runs)
    };
    //old version got libraries here, but we don't actually want that!
    if (evmVersion !== undefined) {
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

  private static processLibraries(
    librariesString: string
  ): Types.LibrarySettings {
    let libraries: Types.Libraries;
    if (librariesString === "") {
      libraries = {};
    } else {
      libraries = Object.assign(
        {},
        ...librariesString.split(";").map(pair => {
          const [name, address] = pair.split(":");
          return { [name]: Web3Utils.toChecksumAddress(address) };
        })
      );
    }
    return { "": libraries }; //empty string as key means it applies to all contracts
  }

  private static extractVyperSettings(
    result: EtherscanResult
  ): Types.VyperSettings {
    const evmVersion: string =
      result.EVMVersion === "Default" ? undefined : result.EVMVersion;
    if (evmVersion !== undefined) {
      return { evmVersion };
    } else {
      return {};
    }
  }
};

type EtherscanResponse = EtherscanSuccess | EtherscanFailure;

interface EtherscanSuccess {
  status: "1";
  message: string;
  result: EtherscanResult[];
}

interface EtherscanFailure {
  status: "0";
  message: string;
  result: string;
}

//apologies for this being stringly-typed, but that's how
//Etherscan does it
interface EtherscanResult {
  SourceCode: string; //really: string | SolcSources | SolcInput
  ABI: string; //really: it's the ABI [we won't use this]
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string; //really: a number used as a boolean
  Runs: string; //really: a number
  ConstructorArguments: string; //encoded as hex string, no 0x in front
  EVMVersion: string;
  Library: string; //semicolon-delimited list of colon-delimited name-address pairs (addresses lack 0x in front)
  LicenseType: string; //ignored
  Proxy: string; //no clue what this is [ignored]
  Implementation: string; //or this [ignored]
  SwarmSource: string; //ignored
}

export default EtherscanFetcher;
