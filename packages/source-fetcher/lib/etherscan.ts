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
    //not putting a try/catch around this; if it throws, we throw
    const response: EtherscanResponse = await request({
      uri: `https://api.etherscan${this.suffix}.io/api`,
      qs: {
        module: "contract",
        action: "getsourcecode",
        address,
        apikey: apiKey
      },
      json: true //turns on auto-parsing :)
    });
    if (response.status === "0") {
      throw new Error(response.result);
    }
    return EtherscanFetcher.processResult(response.result[0]);
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
        settings: this.extractSettings(result, [filename])
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
        settings: this.extractSettings(result, Object.keys(sources))
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
        settings: jsonInput.settings
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

  private static extractSettings(
    result: EtherscanResult,
    paths: string[]
  ): Types.SolcSettings {
    const evmVersion: string =
      result.EVMVersion === "Default" ? undefined : result.EVMVersion;
    const optimizer = {
      enabled: result.OptimizationUsed === "1",
      runs: parseInt(result.Runs)
    };
    //we'll have to do custom parsing for the Library variable; it's not JSON
    //(fortunately it's very simple)
    const libraries: Types.Libraries = Object.assign(
      {},
      ...result.Library.split(";").map(libraryAndAddress => {
        const [library, address] = libraryAndAddress.split(":");
        return {
          [library]: address
        };
      })
    );
    const librariesRepeated = Object.assign(
      {},
      ...paths.map(path => ({ [path]: libraries }))
    );
    if (evmVersion !== undefined) {
      return {
        optimizer,
        evmVersion,
        libraries: librariesRepeated
      };
    } else {
      return {
        optimizer,
        libraries: librariesRepeated
      };
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
  ConstructorArguments: string; //ignored
  EVMVersion: string;
  Library: string; //represents an object but not in JSON
  LicenseType: string; //ignored
  Proxy: string; //no clue what this is [ignored]
  Implementation: string; //or this [ignored]
  SwarmSource: string; //ignored
}

export default EtherscanFetcher;
