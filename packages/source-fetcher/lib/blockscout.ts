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
      "goerli-base": "base-goerli.blockscout.com",
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
      "rsk": "blockscout.com/rsk/mainnet",
      "celo": "explorer.celo.org/mainnet",
      "alfajores-celo": "explorer.celo.org/alfajores",
      "baklava-celo": "explorer.celo.org/baklava",
      "cannoli-celo": "explorer.celo.org/cannoli",
      //not including Callisto as it has chain ID != network ID
      "palm": "explorer.palm.io",
      "testnet-palm": "explorer.palm-uat.xyz",
      "fuse": "exporer.fuse.io",
      "flare": "flare-exporer.flare.network",
      "songbird-flare": "songbird-exporer.flare.network",
      "coston-flare": "coston-exporer.flare.network",
      "coston2-flare": "coston2-exporer.flare.network",
      "europa-skale": "elated-tan-skat.explorer.mainnet.skalenodes.com",
      "emerald-oasis": "exporer.emerald.oasis.dev",
      "cloudwalk": "exporer.mainnet.cloudwalk.io",
      "testnet-cloudwalk": "exporer.testnet.cloudwalk.io",
      "sx": "explorer.sx.technology",
      "toronto-sx": "explorer.toronto.sx.technology",
      "dogechain": "explorer.dogechain.dog",
      "testnet-dogechain": "explorer-testnet.dogechain.dog",
      "nova-arbitrum": "nova-explorer.arbitrum.io",
      "andromeda-metis": "andromeda-explorer.metis.io",
      "goerli-metis": "goerli.explorer.metisdevops.link",
      "boba-avalanche": "blockexplorer.avax.boba.network",
      "bobafuji-avalanche": "blockexplorer.testnet.avax.boba.network",
      "boba-binance": "blockexplorer.bnb.boba.network",
      "testnet-boba-binance": "blockexplorer.testnet.bnb.boba.network",
      "bobabeam": "blockexplorer.bobabeam.boba.network",
      "bobabase": "blockexplorer.bobabase.boba.network",
      "bobaopera": "blockexplorer.bobaopera.boba.network",
      "testnet-bobaopera": "blockexplorer.testnet.bobaopera.boba.network",
      "nahmii": "explorer.nahmii.io",
      //blockscout does not yet support scroll mainnet
      "alpha-scroll": "blockscout.scroll.io",
      "gton": "explorer.gton.network",
      "testnet-gton": "explorer.testnet.gton.network",
      //shib does not appear to have a mainnet yet
      "testnet-shib": "puppyscan.shib.io",
      "moonbeam": "blockscout.moonbeam.network",
      "moonriver": "blockscout.moonriver.moonbeam.network",
      "moonbase-alpha": "moonbase-blockscout.testnet.moonbeam.network",
      "acala": "blockscout.acala.network",
      "mandala-acala": "blockscout.mandala.acala.network",
      "karura": "blockscout.karura.network",
      "edgeware": "edgscan.live",
      "exosama": "explorer.exosama.com",
      "cronos": "cronos.org/explorer",
      "evmos": "blockscout.evmos.org",
      "testnet-evmos": "evm.evmos.dev",
      "kava": "explorer.kava.io",
      "testnet-kava": "explorer.testnet.kava.io",
      "canto": "evm.explorer.canto.io",
      "testnet-canto": "testnet.tuber.build",
      "techpay": "tpcscan.com",
      //not including techpay testnet as I can't determine its network ID
      "point": "explorer.pointnetwork.io",
      "dehvo": "explorer.dehvo.com",
      "syscoin": "explorer.syscoin.org",
      "tanenbaum-syscoin": "tanenbaum.io",
      "elastos": "eth.elastos.io",
      "testnet-elastos": "esc-testnet.elastos.io",
      "smartbch": "sonar.cash",
      "aurora": "explorer.mainnet.aurora.dev",
      "testnet-aurora": "explorer.testnet.aurora.dev",
      "velas": "evmexplorer.velas.com",
      "step": "stepscan.io",
      "testnet-step": "testnet.stepscan.io",
      "c1-milkomeda": "explorer-mainnet-cardano-evm.c1.milkomeda.com",
      "testnet-c1-milkomeda": "explorer-devnet-cardano-evm.c1.milkomeda.com",
      "tombchain": "tombscout.com",
      "metaapes": "explorer.bas.metaapesgame.com",
      "energyweb": "explorer.energyweb.org",
      "volta-energyweb": "volta-explorer.energyweb.org",
      "kucoin": "scan.kcc.io",
      "quadrans": "explorer.quadrans.io",
      "testnet-quadrans": "explorer.testnet.quadrans.io",
      "etho": "explorer.ethoprotocol.com",
      "bitgert": "brisescan.com",
      "qitmeer": "qng.meerscan.io",
      "testnet-qitmeer": "qng-testnet.meerscan.io",
      "v2-phi": "phiscan.com",
      "energi": "explorer.energi.network",
      "loop": "explorer.mainnetloop.com",
      "testnet-loop": "explorer.testnetloop.com",
      "ekta": "ektascan.io",
      "multivac": "mtvscout.com",
      "shyft": "bx.veriscope.network",
      "ethergem": "blockscout.egem.io",
      "findora": "evm.findorascan.io",
      "anvil-findora": "testnet-anvil.evm.findorascan.io",
      "iexec": "blockscout-bellecour.iex.ec",
      "bitkub": "www.bkcscan.com",
      "testnet-bitkub": "testnet.bkcscan.com",
      "rikeza": "rikscan.com",
      "alveychain": "alveyscan.com",
      "camelark": "scan.camelark.com",
      "tecraspace": "explorer.tecra.space",
      "xana": "xanachain.xana.net",
      "atheios": "explorer.atheios.org",
      "eraswap": "eraswap.info",
      "oasys": "scan.oasys.games",
      "rei": "scan.rei.network",
      "mixin": "scan.mvm.dev",
      "etherlite": "explorer.etherlite.org",
      "contentfabric": "exp.contentfabric.io",
      "enuls": "evmscan.nuls.io",
      "testnet-enuls": "beta.evmscan.nuls.io",
      "crossbell": "scan.crossbell.io",
      //blockscout does not support polygon zkevm mainnet
      "testnet-zkevm-polygon": "explorer.public.zkevm-test.net",
      "goerli-linea": "explorer.goerli.linea.build",
      //blockscout does not support mantle mainnet
      "testnet-mantle": "explorer.testnet.mantle.xyz",
      //blockscout does not support zksync era mainnet
      "goerli-era-zksync": "zksync2-testnet.zkscan.io",
      //blockscout does not support pulsechain mainnet
      "v4-testnet-pulsechain": "scan.v4.testnet.pulsechain.com",
      //blockscout does not support venidium mainnet
      "testnet-venidium": "evm-testnet.venidiumexplorer.com",
      //blockscout does support chiliz mainnet, but I can't find good info on it
      "scoville-chiliz": "scoville-explorer.chiliz.com",
      "yuma-horizen": "yuma-explorer.horizen.io",
      "satoshichain": "satoshiscan.io",
      "testnet-lamina1": "testnet-explorer.lamina1.global"
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
