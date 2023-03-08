import debugModule from "debug";
const debug = debugModule("source-fetcher:blockscout");
import axios from "axios";
import { Fetcher, FetcherConstructor, LibrarySettings } from "./types";
import type * as Types from "./types";
import { networkNamesById, networksByName } from "./networks";
// untyped import since no @types/web3-utils exists
const Web3Utils = require("web3-utils");
import {
  makeFilename,
  makeTimer,
  removeLibraries,
  InvalidNetworkError
} from "./common";
import retry from "async-retry";

const blockscoutCommentHeader = `/**
 *Submitted for verification at blockscout.com on 20XX-XX-XX
*/

`; //note we include that final newline

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
    debug("options: %O", options);
    debug("id:", id);
    return new BlockscoutFetcher(id, options ? options.apiKey : "");
  }

  private readonly networkName: string;

  private readonly apiKey: string;
  private readonly delay: number; //minimum # of ms to wait between requests

  private ready: Promise<void>; //always await this timer before making a request.
  //then, afterwards, start a new timer.

  private static readonly apiDomainsByNetworkName: { [name: string]: string } =
    {
      "mainnet": "blockscout.com/eth/mainnet",
      "goerli": "eth-goerli.blockscout.com",
      "goerli-zkevm": "explorer.goerli.zkevm.consensys.net"
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
    debug("apiKey: %s", apiKey);
    this.apiKey = apiKey;
    const baseDelay = this.apiKey ? 200 : 3000;
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
        address: address,
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
      const resultProcessed = this.processSingleResult(result);
      return resultProcessed;
    }
    //case 4: multiple sources
    debug("multi-file input");
    return this.processMultiResult(result, multifileJson);
  }

  private static processSingleResult(
    result: BlockscoutResult
  ): Types.SourceInfo {
    const filename = makeFilename(result.ContractName);
    return {
      contractName: result.ContractName,
      sources: {
        //we prepend this header comment so that line numbers in the debugger
        //will match up with what's displayed on the website; note that other
        //cases don't display a similar header on the website
        [filename]: blockscoutCommentHeader + result.SourceCode
      },
      options: {
        language: "Solidity",
        version: result.CompilerVersion,
        settings: this.extractSettings(result),
        specializations: {
          libraries:
            result.CompilerSettings && result.CompilerSettings.libraries
              ? result.CompilerSettings.libraries
              : {},
          constructorArguments: result.ConstructorArguments
            ? result.ConstructorArguments
            : ""
        }
      }
    };
  }

  private static processMultiResult(
    result: BlockscoutResult,
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
          constructorArguments: result.ConstructorArguments || ""
        }
      }
    };
  }

  private static processJsonResult(
    result: BlockscoutResult,
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

  private static processVyperResult(
    result: BlockscoutResult
  ): Types.SourceInfo {
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

  private static extractSettings(result: BlockscoutResult): Types.SolcSettings {
    const evmVersion: string =
      result.EVMVersion === "Default" || "default"
        ? undefined
        : result.EVMVersion;
    const optimizer = {
      enabled: result.OptimizationUsed === "1",
      runs: parseInt(result.Runs) ? parseInt(result.Runs) : 200
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
    result: BlockscoutResult
  ): Types.VyperSettings {
    const evmVersion: string =
      result.EVMVersion === "Default" ? undefined : result.EVMVersion;
    //the optimize flag is not currently supported by etherscan;
    //any Vyper contract currently verified on etherscan necessarily has
    //optimize flag left unspecified (and therefore effectively true).
    //do NOT look at OptimizationUsed for Vyper contracts; it will always
    //be "0" even though in fact optimization *was* used.  just leave
    //the optimize flag unspecified.
    if (evmVersion !== undefined) {
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
  result: string;
}

type BlockscoutCompilerSettings = {
  evmVersion: string;
  libraries: LibrarySettings; // this is not a string; TODO double check what this should look like
  optimizer: {
    enabled: boolean;
    runs: number;
  };
  outputSelection: any; // TODO double check what this should look like
};

interface BlockscoutResult {
  SourceCode: string; //really: string | SolcSources | SolcInput
  ABI: string; //really: it's the ABI [we won't use this]
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string; //really: a number used as a boolean
  Runs: string; //really: a number
  ConstructorArguments?: string; //encoded as hex string, no 0x in front
  EVMVersion: string;
  CompilerSettings: BlockscoutCompilerSettings; //semicolon-delimited list of colon-delimited name-address pairs (addresses lack 0x in front)
}

export default BlockscoutFetcher;
