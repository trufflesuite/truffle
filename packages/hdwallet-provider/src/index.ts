import {
  mnemonicToSeedSync,
  validateMnemonic
} from "ethereum-cryptography/bip39";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english";
import * as EthUtil from "ethereumjs-util";
import { Transaction, FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import Common from "@ethereumjs/common";

import { PollingBlockTracker } from 'eth-block-tracker';
import { JsonRpcEngine } from "@metamask/json-rpc-engine";
//import type { JsonRpcMiddleware } from "@metamask/json-rpc-engine";
import { SafeEventEmitterProvider, providerFromEngine } from "@metamask/eth-json-rpc-provider";

// @ts-ignore
import createFilterMiddleware from "eth-json-rpc-filters";
// @ts-ignore
import NonceSubProvider from "nonce-tracker";
//import HookedSubprovider from "web3-provider-engine/subproviders/hooked-wallet";
// @ts-ignore
import ProviderSubprovider from "web3-provider-engine/subproviders/provider";
// @ts-ignore
import RpcProvider from "web3-provider-engine/subproviders/rpc";
// @ts-ignore
import WebsocketProvider from "web3-provider-engine/subproviders/websocket";

import Url from "url";
import type {
  JsonRpcParams,
  JsonRpcRequest,
  JsonRpcResponse
} from "@metamask/utils";
import type { ConstructorArguments } from "./constructor/ConstructorArguments";
import { getOptions } from "./constructor/getOptions";
import { getPrivateKeys } from "./constructor/getPrivateKeys";
import { getMnemonic } from "./constructor/getMnemonic";
import type { ChainId, ChainSettings, Hardfork, ProviderOrUrl } from "./constructor/types";
import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";
import {
  createAccountGeneratorFromSeedAndPath,
  uncompressedPublicKeyToAddress
} from "@truffle/hdwallet";

// Important: do not use debug module. Reason: https://github.com/trufflesuite/truffle/issues/2374#issuecomment-536109086

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
let singletonNonceSubProvider: null | NonceSubProvider;

// TODO: Constrain type
type JsonRpcProvider = Record<string, unknown>;

const getSingletonNonceSubProvider = (opts: {rpcProvider: JsonRpcProvider, blockTracker: any}): NonceSubProvider => {
  if (singletonNonceSubProvider) {
  } else {
    singletonNonceSubProvider = new NonceSubProvider({
        provider: opts.rpcProvider,
        blockTracker: opts.blockTracker,
        getPendingTransactions: (_address: string) => [],
        getConfirmedTransactions: (_address: string) => [],
    });
  }
  return singletonNonceSubProvider;
}

class HDWalletProvider {
  private walletHdpath: string;
  #wallets: { [address: string]: Buffer };
  #addresses: string[];
  #provider: SafeEventEmitterProvider;
  private chainId?: ChainId;
  private chainSettings: ChainSettings;
  private hardfork: Hardfork;
  private initialized: Promise<void>;

  constructor(...args: ConstructorArguments) {
    const {
      provider,
      url,
      providerOrUrl,
      addressIndex = 0,
      numberOfAddresses = 10,
      shareNonce = true,
      derivationPath = `m/44'/60'/0'/0/`,
      // TODO: Unused/ deprecated...?
      // pollingInterval = 4000,
      chainId,
      chainSettings = {},

      // what's left is either a mnemonic or a list of private keys
      ...signingAuthority
    } = getOptions(...args);

    const mnemonic = getMnemonic(signingAuthority);
    const privateKeys = getPrivateKeys(signingAuthority);

    this.walletHdpath = derivationPath;
    this.#wallets = {};
    this.#addresses = [];
    this.chainSettings = chainSettings;
    const engine = new JsonRpcEngine({
      // pollingInterval
    });

    let providerToUse: ProviderOrUrl;
    if (typeof provider !== 'undefined' && HDWalletProvider.isValidProvider(provider)) {
      providerToUse = provider;
    } else if (typeof url !== 'undefined' && HDWalletProvider.isValidProvider(url)) {
      providerToUse = url;
    } else {
      if (typeof providerOrUrl === 'undefined') {
        throw new Error(
          [
            `No provider or an invalid provider was specified.`,
            "Please specify a valid provider or URL, using the http, https, " +
              "ws, or wss protocol.",
            ""
          ].join("\n")
        );
      }
      providerToUse = providerOrUrl;
    }

    if (!HDWalletProvider.isValidProvider(providerToUse)) {
      throw new Error(
        [
          `No provider or an invalid provider was specified: '${providerToUse}'`,
          "Please specify a valid provider or URL, using the http, https, " +
            "ws, or wss protocol.",
          ""
        ].join("\n")
      );
    }

    if (mnemonic && mnemonic.phrase) {
      this.checkBIP39Mnemonic({
        ...mnemonic,
        addressIndex,
        numberOfAddresses
      });
    } else if (privateKeys) {
      const options = Object.assign({}, { privateKeys }, { addressIndex });
      this.ethUtilValidation(options);
    } // no need to handle else case here, since matchesNewOptions() covers it

    if (this.#addresses.length === 0) {
      throw new Error(
        `Could not create addresses from your mnemonic or private key(s). ` +
          `Please check that your inputs are correct.`
      );
    }

    const tmpAccounts = this.#addresses;
    const tmpWallets = this.#wallets;

    // if user supplied the chain id, use that - otherwise fetch it
    if (
      typeof chainId !== "undefined" ||
      (chainSettings && typeof chainSettings.chainId !== "undefined")
    ) {
      this.chainId = chainId || chainSettings.chainId;
      this.initialized = Promise.resolve();
    } else {
      this.initialized = this.initialize();
    }

    // EIP155 compliant transactions are enabled for hardforks later
    // than or equal to "spurious dragon"
    this.hardfork =
      chainSettings && chainSettings.hardfork
        ? chainSettings.hardfork
        : "london";

    const self = this;

    engine.push(
      new HookedSubprovider({
        getAccounts(cb: any) {
          cb(null, tmpAccounts);
        },
        getPrivateKey(address: string, cb: any) {
          if (!tmpWallets[address]) {
            cb("Account not found");
            return;
          } else {
            cb(null, tmpWallets[address].toString("hex"));
          }
        },
        async signTransaction(txParams: any, cb: any) {
          await self.initialized;
          // we need to rename the 'gas' field
          txParams.gasLimit = txParams.gas;
          delete txParams.gas;

          let pkey;
          const from = txParams.from.toLowerCase();
          if (tmpWallets[from]) {
            pkey = tmpWallets[from];
          } else {
            cb("Account not found");
            return;
          }
          const chain = self.chainId;
          const KNOWN_CHAIN_IDS = new Set([1, 3, 4, 5, 42]);
          let txOptions;
          if (typeof chain !== "undefined" && KNOWN_CHAIN_IDS.has(chain)) {
            txOptions = {
              common: new Common({ chain, hardfork: self.hardfork })
            };
          } else if (typeof chain !== "undefined") {
            txOptions = {
              common: Common.forCustomChain(
                1,
                {
                  name: "custom chain",
                  chainId: chain
                },
                self.hardfork
              )
            };
          }

          // Taken from https://github.com/ethers-io/ethers.js/blob/2a7ce0e72a1e0c9469e10392b0329e75e341cf18/packages/abstract-signer/src.ts/index.ts#L215
          const hasEip1559 =
            txParams.maxFeePerGas !== undefined ||
            txParams.maxPriorityFeePerGas !== undefined;
          const tx = hasEip1559
            ? FeeMarketEIP1559Transaction.fromTxData(txParams, txOptions)
            : Transaction.fromTxData(txParams, txOptions);

          const signedTx = tx.sign(pkey as Buffer);
          const rawTx = `0x${signedTx.serialize().toString("hex")}`;
          cb(null, rawTx);
        },
        signMessage({ data, from }: any, cb: any) {
          const dataIfExists = data;
          if (!dataIfExists) {
            cb("No data to sign");
            return;
          }
          if (!tmpWallets[from]) {
            cb("Account not found");
            return;
          }
          let pkey = tmpWallets[from];
          const dataBuff = EthUtil.toBuffer(dataIfExists);
          const msgHashBuff = EthUtil.hashPersonalMessage(dataBuff);
          const sig = EthUtil.ecsign(msgHashBuff, pkey);
          const rpcSig = EthUtil.toRpcSig(sig.v, sig.r, sig.s);
          cb(null, rpcSig);
        },
        signPersonalMessage(...args: any[]) {
          this.signMessage(...args);
        },
        signTypedMessage(
          { data, from }: { data: string; from: string },
          cb: any
        ) {
          if (!data) {
            cb("No data to sign");
            return;
          }
          // convert address to lowercase in case it is in checksum format
          const fromAddress = from.toLowerCase();
          if (!tmpWallets[fromAddress]) {
            cb("Account not found");
            return;
          }
          const signature = signTypedData({
            data: JSON.parse(data),
            privateKey: tmpWallets[fromAddress],
            version: SignTypedDataVersion.V4
          });
          cb(null, signature);
        }
      })
    );

    const createProvider = () => {
      if (typeof providerToUse === "string") {
        const url = providerToUse;

        const providerProtocol = (
          Url.parse(url).protocol || "http:"
        ).toLowerCase();

        switch (providerProtocol) {
          case "ws:":
          case "wss:":
            return new WebsocketProvider({ rpcUrl: url });
          default:
            return new RpcProvider({ rpcUrl: url });
        }
      } else {
        return new ProviderSubprovider(providerToUse);
      }
    }
    const rpcProvider = createProvider();

    const blockTracker = new PollingBlockTracker({
      provider: rpcProvider,
      // pollingInterval?: number;
      // retryTimeout?: number;
      // keepEventLoopActive?: boolean;
      // setSkipCacheFlag?: boolean;
      // blockResetDuration?: number;
      // usePastBlocks?: boolean;
    });

    const nonceSubProvider = shareNonce
      ? getSingletonNonceSubProvider({
        blockTracker,
        rpcProvider,
      })
      : new NonceSubProvider({
        blockTracker,
        provider: rpcProvider,
        getPendingTransactions: (_address: string) => [],
        getConfirmedTransactions: (_address: string) => [],
      });

    const filtersSubProvider = createFilterMiddleware({
      blockTracker,
      provider: rpcProvider,
    });
    engine.push(nonceSubProvider as any);
    engine.push(filtersSubProvider);
    engine.push(rpcProvider);

    this.#provider = providerFromEngine(engine);
  }

  private initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#provider.sendAsync(
        {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_chainId",
          params: []
        },
        (error: any, response: JsonRpcResponse<string>) => {
          if (error) {
            reject(error);
            return;
          } else if ('error' in response) {
            reject(response.error);
            return;
          }
          if ('result' in response && isNaN(parseInt(response.result, 16))) {
            const message =
              "When requesting the chain id from the node, it" +
              `returned the malformed result ${response.result}.`;
            throw new Error(message);
          }
          this.chainId = parseInt(response.result, 16);
          resolve();
        }
      );
    });
  }

  // private helper to check if given mnemonic uses BIP39 passphrase protection
  private checkBIP39Mnemonic({
    addressIndex,
    numberOfAddresses,
    phrase,
    password
  }: {
    addressIndex: number;
    numberOfAddresses: number;
    phrase: string;
    password?: string;
  }) {
    if (!validateMnemonic(phrase, wordlist)) {
      throw new Error("Mnemonic invalid or undefined");
    }

    const hdwallet = createAccountGeneratorFromSeedAndPath(
      mnemonicToSeedSync(phrase, password),
      this.walletHdpath.replace(/\/$/, "").split("/")
    );

    // crank the addresses out
    for (let i = addressIndex; i < addressIndex + numberOfAddresses; i++) {
      const wallet = hdwallet(i);
      const addr = `0x${Buffer.from(
        uncompressedPublicKeyToAddress(wallet.publicKey)
      ).toString("hex")}`;
      this.#addresses.push(addr);
      this.#wallets[addr] = wallet.privateKey;
    }
  }

  // private helper leveraging ethUtils to populate wallets/addresses
  private ethUtilValidation({
    addressIndex,
    privateKeys
  }: {
    addressIndex: number;
    privateKeys: string[];
  }) {
    // crank the addresses out
    for (let i = addressIndex; i < privateKeys.length; i++) {
      const privateKey = Buffer.from(privateKeys[i].replace("0x", ""), "hex");
      if (EthUtil.isValidPrivate(privateKey)) {
        const wallet = EthUtil.privateToAddress(privateKey);
        const address = `0x${wallet.toString("hex")}`;
        this.#addresses.push(address);
        this.#wallets[address] = privateKey;
      }
    }
  }

  public send(
    payload: JsonRpcRequest,
    callback: (error: null | Error, response: JsonRpcResponse<JsonRpcParams>) => void
  ): void {
    this.initialized.then(() => {
      // @ts-ignore we patch callback method so it doesn't conform to type
      this.#provider.sendAsync(payload, callback);
    });
  }

  public sendAsync(
    payload: JsonRpcRequest,
    callback: (error: null | Error, response?: JsonRpcResponse<JsonRpcParams>) => void
  ): void {
    this.initialized.then(() => {
      // @ts-ignore we patch callback method so it doesn't conform to type
      this.#provider.sendAsync(payload, callback);
    });
  }

  public getAddress(idx?: number): string {
    if (!idx) {
      return this.#addresses[0];
    } else {
      return this.#addresses[idx];
    }
  }

  public getAddresses(): string[] {
    return this.#addresses;
  }

  public static isValidProvider(provider: any): boolean {
    if (!provider) return false;
    if (typeof provider === "string") {
      const validProtocols = ["http:", "https:", "ws:", "wss:"];
      const url = Url.parse(provider.toLowerCase());
      return !!(validProtocols.includes(url.protocol || "") && url.slashes);
    } else if ("request" in provider) {
      // provider is an 1193 provider
      return true;
    } else if ("send" in provider) {
      // provider is a "legacy" provider
      return true;
    }
    return false;
  }
}

export = HDWalletProvider;
