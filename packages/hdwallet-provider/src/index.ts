import "source-map-support/register";
import * as bip39 from "ethereum-cryptography/bip39";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english";
import * as EthUtil from "ethereumjs-util";
import ethJSWallet from "ethereumjs-wallet";
import EthereumHDKey from "ethereumjs-wallet/hdkey";
import Transaction from "ethereumjs-tx";
// @ts-ignore
import ProviderEngine from "@trufflesuite/web3-provider-engine";
import FiltersSubprovider from "@trufflesuite/web3-provider-engine/subproviders/filters";
import NonceSubProvider from "@trufflesuite/web3-provider-engine/subproviders/nonce-tracker";
import HookedSubprovider from "@trufflesuite/web3-provider-engine/subproviders/hooked-wallet";
import ProviderSubprovider from "@trufflesuite/web3-provider-engine/subproviders/provider";
// @ts-ignore
import RpcProvider from "@trufflesuite/web3-provider-engine/subproviders/rpc";
// @ts-ignore
import WebsocketProvider from "@trufflesuite/web3-provider-engine/subproviders/websocket";
import Url from "url";
import { JSONRPCRequestPayload, JSONRPCErrorCallback } from "ethereum-protocol";
import { Callback, JsonRPCResponse } from "web3/providers";

// Important: do not use debug module. Reason: https://github.com/trufflesuite/truffle/issues/2374#issuecomment-536109086

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
const singletonNonceSubProvider = new NonceSubProvider();

export interface MnemonicOptions {
  phrase: string;
  password?: string;
}

export interface Mnemonic {
  phrase: string;
  password: string;
}

export interface PrivateKeysOptions {
  privateKeys: string | string[];
}

export interface CommonConstructorOptions {
  url: string;
  addressIndex?: number;
  numberOfAddresses?: number;
  sharedNonce?: boolean;
  derivationPath?: string;
}

export type ConstructorOptions =
  | (CommonConstructorOptions & MnemonicOptions)
  | (CommonConstructorOptions & PrivateKeysOptions);

const OPTIONS_DEFAULTS = {
  ADDRESS_INDEX: 0,
  NUMBER_OF_ADDRESSES: 10,
  SHARED_NONCE: true,
  DERIVATION_PATH: `m/44'/60'/0'/0/`
};

const getOptions = (
  mnemonicOrPrivateKeysOrOptions: string | string[] | ConstructorOptions,
  options: any[]
): {
  url: string;
  addressIndex: number;
  numberOfAddresses: number;
  sharedNonce: boolean;
  derivationPath: string;
} => {
  if (options.length) {
    const [
      url,
      addressIndex = OPTIONS_DEFAULTS.ADDRESS_INDEX,
      numberOfAddresses = OPTIONS_DEFAULTS.NUMBER_OF_ADDRESSES,
      sharedNonce = OPTIONS_DEFAULTS.SHARED_NONCE,
      derivationPath = OPTIONS_DEFAULTS.DERIVATION_PATH
    ] = options;

    return {
      addressIndex,
      numberOfAddresses,
      sharedNonce,
      derivationPath,
      url
    };
  }

  const {
    url,
    addressIndex = OPTIONS_DEFAULTS.ADDRESS_INDEX,
    numberOfAddresses = OPTIONS_DEFAULTS.NUMBER_OF_ADDRESSES,
    sharedNonce = OPTIONS_DEFAULTS.SHARED_NONCE,
    derivationPath = OPTIONS_DEFAULTS.DERIVATION_PATH
  } = mnemonicOrPrivateKeysOrOptions as ConstructorOptions;

  return { addressIndex, numberOfAddresses, sharedNonce, derivationPath, url };
};

const getMnemonic = (
  mnemonicOrPrivateKeysOrOptions: string | string[] | ConstructorOptions
): { phrase: string | null; password: string } => {
  const phrase =
    typeof mnemonicOrPrivateKeysOrOptions === "string" &&
    mnemonicOrPrivateKeysOrOptions.includes(" ")
      ? mnemonicOrPrivateKeysOrOptions
      : (mnemonicOrPrivateKeysOrOptions as MnemonicOptions).phrase || null;

  const { password = "" } = mnemonicOrPrivateKeysOrOptions as MnemonicOptions;

  return { phrase, password };
};

const getPrivateKeys = (
  mnemonicOrPrivateKeysOrOptions: string | string[] | ConstructorOptions
): string[] => {
  if (Array.isArray(mnemonicOrPrivateKeysOrOptions)) {
    return mnemonicOrPrivateKeysOrOptions;
  }

  return typeof mnemonicOrPrivateKeysOrOptions === "string"
    ? [mnemonicOrPrivateKeysOrOptions]
    : [];
};

const normalizeConstructorOptions = (
  mnemonicOrPrivateKeysOrOptions: string | string[] | ConstructorOptions,
  options: any[]
): {
  mnemonic: { phrase: string | null; password: string };
  privateKeys: string[];
  url: string | any;
  addressIndex: number;
  numberOfAddresses: number;
  sharedNonce: boolean;
  derivationPath: string;
} => {
  const parsedOptions = getOptions(mnemonicOrPrivateKeysOrOptions, options);
  const mnemonic = getMnemonic(mnemonicOrPrivateKeysOrOptions);
  const privateKeys = getPrivateKeys(mnemonicOrPrivateKeysOrOptions);

  return {
    mnemonic,
    privateKeys,
    ...parsedOptions
  };
};

class HDWalletProvider {
  private hdwallet?: EthereumHDKey;
  private walletHdpath: string;
  private wallets: { [address: string]: ethJSWallet };
  private addresses: string[];

  public engine: ProviderEngine;

  constructor(
    mnemonicOrPrivateKeysOrOptions: string | string[] | ConstructorOptions,
    ...args: any[]
  ) {
    const {
      mnemonic,
      privateKeys,
      url,
      addressIndex,
      numberOfAddresses,
      sharedNonce,
      derivationPath
    } = normalizeConstructorOptions(mnemonicOrPrivateKeysOrOptions, args);

    this.walletHdpath = derivationPath;
    this.wallets = {};
    this.addresses = [];
    this.engine = new ProviderEngine();

    if (!HDWalletProvider.isValidProvider(url)) {
      throw new Error(
        [
          `Malformed provider URL: '${url}'`,
          "Please specify a correct URL, using the http, https, ws, or wss protocol.",
          ""
        ].join("\n")
      );
    }

    // private helper to check if given mnemonic uses BIP39 passphrase protection
    const checkBIP39Mnemonic = ({
      phrase,
      password
    }: {
      phrase: string;
      password: string;
    }) => {
      this.hdwallet = EthereumHDKey.fromMasterSeed(
        bip39.mnemonicToSeedSync(phrase, password)
      );

      if (!bip39.validateMnemonic(phrase, wordlist)) {
        throw new Error("Mnemonic invalid or undefined");
      }

      // crank the addresses out
      for (let i = addressIndex; i < addressIndex + numberOfAddresses; i++) {
        const wallet = this.hdwallet
          .derivePath(this.walletHdpath + i)
          .getWallet();
        const addr = `0x${wallet.getAddress().toString("hex")}`;
        this.addresses.push(addr);
        this.wallets[addr] = wallet;
      }
    };

    // private helper leveraging ethUtils to populate wallets/addresses
    const ethUtilValidation = (privateKeys: string[]) => {
      // crank the addresses out
      for (let i = addressIndex; i < privateKeys.length; i++) {
        const privateKey = Buffer.from(privateKeys[i].replace("0x", ""), "hex");
        if (EthUtil.isValidPrivate(privateKey)) {
          const wallet = ethJSWallet.fromPrivateKey(privateKey);
          const address = wallet.getAddressString();
          this.addresses.push(address);
          this.wallets[address] = wallet;
        }
      }
    };

    if (mnemonic.phrase) {
      checkBIP39Mnemonic(mnemonic as Mnemonic);
    } else {
      ethUtilValidation(privateKeys as string[]);
    }

    const tmp_accounts = this.addresses;
    const tmp_wallets = this.wallets;

    this.engine.addProvider(
      new HookedSubprovider({
        getAccounts(cb: any) {
          cb(null, tmp_accounts);
        },
        getPrivateKey(address: string, cb: any) {
          if (!tmp_wallets[address]) {
            return cb("Account not found");
          } else {
            cb(null, tmp_wallets[address].getPrivateKey().toString("hex"));
          }
        },
        signTransaction(txParams: any, cb: any) {
          let pkey;
          const from = txParams.from.toLowerCase();
          if (tmp_wallets[from]) {
            pkey = tmp_wallets[from].getPrivateKey();
          } else {
            cb("Account not found");
          }
          const tx = new Transaction(txParams);
          tx.sign(pkey as Buffer);
          const rawTx = `0x${tx.serialize().toString("hex")}`;
          cb(null, rawTx);
        },
        signMessage({ data, from }: any, cb: any) {
          const dataIfExists = data;
          if (!dataIfExists) {
            cb("No data to sign");
          }
          if (!tmp_wallets[from]) {
            cb("Account not found");
          }
          let pkey = tmp_wallets[from].getPrivateKey();
          const dataBuff = EthUtil.toBuffer(dataIfExists);
          const msgHashBuff = EthUtil.hashPersonalMessage(dataBuff);
          const sig = EthUtil.ecsign(msgHashBuff, pkey);
          const rpcSig = EthUtil.toRpcSig(sig.v, sig.r, sig.s);
          cb(null, rpcSig);
        },
        signPersonalMessage(...args: any[]) {
          this.signMessage(...args);
        }
      })
    );

    !sharedNonce
      ? this.engine.addProvider(new NonceSubProvider())
      : this.engine.addProvider(singletonNonceSubProvider);

    this.engine.addProvider(new FiltersSubprovider());
    if (typeof url === "string") {
      const providerProtocol = (
        Url.parse(url).protocol || "http:"
      ).toLowerCase();

      switch (providerProtocol) {
        case "ws:":
        case "wss:":
          this.engine.addProvider(new WebsocketProvider({ rpcUrl: url }));
          break;
        default:
          this.engine.addProvider(new RpcProvider({ rpcUrl: url }));
      }
    } else {
      this.engine.addProvider(new ProviderSubprovider(url));
    }

    // Required by the provider engine.
    this.engine.start((err: any) => {
      if (err) throw err;
    });
  }

  public send(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    return this.engine.send.call(this.engine, payload, callback);
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    this.engine.sendAsync.call(this.engine, payload, callback);
  }

  public getAddress(idx?: number): string {
    if (!idx) {
      return this.addresses[0];
    } else {
      return this.addresses[idx];
    }
  }

  public getAddresses(): string[] {
    return this.addresses;
  }

  public static isValidProvider(provider: string | any): boolean {
    const validProtocols = ["http:", "https:", "ws:", "wss:"];

    if (typeof provider === "string") {
      const url = Url.parse(provider.toLowerCase());
      return !!(validProtocols.includes(url.protocol || "") && url.slashes);
    }

    return true;
  }
}

export default HDWalletProvider;
