import { Fetcher, FetcherConstructor } from "./types";
import * as Types from "./types";
import { networksById } from "./common";
import request from "request-promise-native";

const apiKey: string = ""; //don't check in the real key!
//note: fake keys don't work but missing keys do for now it seems...?

//this looks awkward but the TS docs actually suggest this :P
const EtherscanFetcher: FetcherConstructor = class EtherscanFetcher
  implements Fetcher {
  get name(): string {
    return "etherscan";
  }

  static async forNetworkId(id: number): Promise<EtherscanFetcher> {
    return new EtherscanFetcher(id);
  }

  constructor(networkId: number) {
    let networkName = networksById[networkId];
    if (networkName === undefined) {
      this.validNetwork = false;
    } else {
      this.validNetwork = true;
      this.suffix = networkName === "mainnet" ? "" : `-${networkName}`;
    }
  }

  private validNetwork: boolean;
  private suffix: string;

  async isNetworkValid(): Promise<boolean> {
    return this.validNetwork;
  }

  async fetchSourcesForAddress(
    address: string
  ): Promise<Types.SourceInfo | null> {
    const response = await this.getSuccessfulResponse(address);
    return EtherscanFetcher.processResult(response.result[0]);
  }

  private async getSuccessfulResponse(
    address: string
  ): Promise<EtherscanSuccess> {
    //not putting a try/catch around this; if it throws, we throw
    const response: EtherscanResponse = await request({
      uri: `https://api${this.suffix}.etherscan.io/api`,
      qs: {
        module: "contract",
        action: "getsourcecode",
        address,
        apikey: apiKey
      },
      json: true //turns on auto-parsing :)
    });
    if (response.status === "0") {
      //no retry logic for now; will add later
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
    if (result.CompilerVersion.startsWith("vyper")) {
      return null;
    }
    let sourceJson: Types.SolcSources | Types.SolcInput;
    try {
      sourceJson = JSON.parse(result.SourceCode);
    } catch (_) {
      //case 3: single source
      return this.processSingleResult(result);
    }
    //now: do we have a multi-result or a JSON-result?
    if (this.isFullJson(sourceJson)) {
      //case 5: full JSON input
      return this.processJsonResult(result, sourceJson);
    } else {
      //case 4: multiple sources
      return this.processMultiResult(result, sourceJson);
    }
  }

  private static isFullJson(
    sourceJson: Types.SolcSources | Types.SolcInput
  ): sourceJson is Types.SolcInput {
    return (<Types.SolcInput>sourceJson).language === "Solidity";
  }

  private static processSingleResult(
    result: EtherscanResult
  ): Types.SourceInfo {
    const filename = result.ContractName || "Contract.sol"; //just to be sure it's not empty
    return {
      sources: {
        [filename]: result.SourceCode
      },
      options: {
        version: result.CompilerVersion,
        settings: this.extractSettings(result)
      }
    };
  }

  private static processMultiResult(
    result: EtherscanResult,
    sources: Types.SolcSources
  ): Types.SourceInfo {
    return {
      sources: this.processSources(sources),
      options: {
        version: result.CompilerVersion,
        settings: this.extractSettings(result)
      }
    };
  }

  private static processJsonResult(
    result: EtherscanResult,
    jsonInput: Types.SolcInput
  ): Types.SourceInfo {
    return {
      sources: this.processSources(jsonInput.sources),
      options: {
        version: result.CompilerVersion,
        settings: this.removeLibraries(jsonInput.settings)
      }
    };
  }

  private static processSources(
    sources: Types.SolcSources
  ): Types.SourcesByPath {
    return Object.assign(
      {},
      ...Object.entries(sources).map(([path, { content: source }]) => ({
        [path]: source
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

  //we *don't* want to pass library info!  unlinked bytecode is better!
  private static removeLibraries(
    settings: Types.SolcSettings
  ): Types.SolcSettings {
    let copySettings: Types.SolcSettings = { ...settings };
    delete copySettings.libraries;
    return copySettings;
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
  ConstructorArguments: string; //ignored
  EVMVersion: string;
  Library: string; //represents an object but not in JSON (we'll actually ignore this)
  LicenseType: string; //ignored
  Proxy: string; //no clue what this is [ignored]
  Implementation: string; //or this [ignored]
  SwarmSource: string; //ignored
}

export default EtherscanFetcher;
