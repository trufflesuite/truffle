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

/*
 * type aliases for better readability around legacy positional arguments
 */
export type MnemonicPhrase = string;
export type MnemonicPassword = string;
export interface Mnemonic {
  phrase: MnemonicPhrase;
  password?: MnemonicPassword;
}
export type PrivateKey = string;
export type Provider = any;
export type ProviderUrl = string;
export type ProviderOrUrl = Provider | ProviderUrl;
export type AddressIndex = number;
export type NumberOfAddresses = number;
export type ShareNonce = boolean;
export type DerivationPath = string;

/*
 * namespace wrapper for new constructor options interface
 */
export namespace NewConstructor {
  export interface MnemonicSigningAuthority {
    mnemonic: Mnemonic;
  }

  export interface PrivateKeySigningAuthority {
    privateKeys: PrivateKey[];
  }

  export type SigningAuthority =
    | MnemonicSigningAuthority
    | PrivateKeySigningAuthority;

  export interface CommonOptions {
    providerOrUrl: ProviderOrUrl;
    addressIndex?: AddressIndex;
    numberOfAddresses?: NumberOfAddresses;
    shareNonce?: ShareNonce;
    derivationPath?: DerivationPath;
  }

  export type Options = SigningAuthority & CommonOptions;

  // extract the mnemonic if that's the style used, or return undefined
  export const getMnemonic = (
    signingAuthority: SigningAuthority
  ): Mnemonic | undefined => {
    if ("mnemonic" in signingAuthority) {
      return signingAuthority.mnemonic;
    }
  };

  // extract the private keys if that's the style used, or return undefined
  export const getPrivateKeys = (
    signingAuthority: SigningAuthority
  ): PrivateKey[] | undefined => {
    if ("privateKeys" in signingAuthority) {
      return signingAuthority.privateKeys;
    }
  };
}

/*
 * namespace wrapper for old-style positional arguments
 */
export namespace LegacyConstructor {
  type PossibleArguments = [
    /*
     * required
     */
    MnemonicPhrase | PrivateKey[],
    ProviderOrUrl,

    /*
     * optional
     */
    AddressIndex,
    NumberOfAddresses,
    ShareNonce,
    DerivationPath
  ];

  // (awful to have to do it this way)
  export type Arguments =
    | [PossibleArguments[0], PossibleArguments[1]]
    | [PossibleArguments[0], PossibleArguments[1], PossibleArguments[2]]
    | [
        PossibleArguments[0],
        PossibleArguments[1],
        PossibleArguments[2],
        PossibleArguments[3]
      ]
    | [
        PossibleArguments[0],
        PossibleArguments[1],
        PossibleArguments[2],
        PossibleArguments[3],
        PossibleArguments[4]
      ]
    | [
        PossibleArguments[0],
        PossibleArguments[1],
        PossibleArguments[2],
        PossibleArguments[3],
        PossibleArguments[4],
        PossibleArguments[5]
      ];

  // check that the first argument is a mnemonic phrase
  const isMnemonicPhrase = (
    mnemonicPhraseOrPrivateKeys: MnemonicPhrase | PrivateKey[]
  ): mnemonicPhraseOrPrivateKeys is MnemonicPhrase =>
    typeof mnemonicPhraseOrPrivateKeys === "string";

  // check that the first argument is a list of private keys
  const isPrivateKeys = (
    mnemonicPhraseOrPrivateKeys: MnemonicPhrase | PrivateKey[]
  ): mnemonicPhraseOrPrivateKeys is PrivateKey[] =>
    mnemonicPhraseOrPrivateKeys instanceof Array;

  // turn polymorphic first argument into { mnemonic } or { privateKeys }
  const getSigningAuthorityOptions = (
    mnemonicPhraseOrPrivateKeys: MnemonicPhrase | PrivateKey[]
  ): NewConstructor.SigningAuthority => {
    if (isMnemonicPhrase(mnemonicPhraseOrPrivateKeys)) {
      return {
        mnemonic: {
          phrase: mnemonicPhraseOrPrivateKeys
        }
      };
    } else if (isPrivateKeys(mnemonicPhraseOrPrivateKeys)) {
      return {
        privateKeys: mnemonicPhraseOrPrivateKeys
      };
    } else {
      throw new Error(
        `First argument to new HDWalletProvider() must be a mnemonic phrase or a list of private keys. ` +
          `Received: ${JSON.stringify(mnemonicPhraseOrPrivateKeys)}`
      );
    }
  };

  // convert legacy style positional arguments to new, single-arg options format
  export const toOptions = (args: Arguments): NewConstructor.Options => {
    // otherwise, if arguments match the old-style, extract properties and handle polymorphism
    const [
      mnemonicPhraseOrPrivateKeys,
      providerOrUrl,
      addressIndex,
      numberOfAddresses,
      shareNonce,
      derivationPath
    ] = args;

    const signingAuthority = getSigningAuthorityOptions(
      mnemonicPhraseOrPrivateKeys
    );

    return {
      ...signingAuthority,
      providerOrUrl,
      addressIndex,
      numberOfAddresses,
      shareNonce,
      derivationPath
    };
  };
}

/*
 * top-level polymorphic type
 */
export type ConstructorArguments =
  | LegacyConstructor.Arguments // either the old-style tuple type
  | [NewConstructor.Options]; // or a single argument for new-style options

// type predicate guard to determine at runtime if arguments conform to
// new-style constructor args.
const matchesNewOptions = (
  args: ConstructorArguments
): args is [NewConstructor.Options] => {
  // new-style means exactly one argument
  if (args.length !== 1) {
    return false;
  }

  const [options] = args;

  // beyond that, determine based on property inclusion check for required keys
  return (
    "providerOrUrl" in options &&
    ("mnemonic" in options || "privateKeys" in options)
  );
};

// type predicate guard to determine at runtime if arguments conform to
// old-style constructor args.
const matchesLegacyArguments = (
  args: ConstructorArguments
): args is LegacyConstructor.Arguments =>
  // first check for alternate (new-style) case for basic determination
  !matchesNewOptions(args) &&
  // then additionally make sure we have the two required options we need
  args.filter(arg => arg !== undefined).length >= 2;

// normalize arguments passed to constructor to match single, new-style options
// argument
const getOptions = (...args: ConstructorArguments): NewConstructor.Options => {
  if (matchesNewOptions(args)) {
    // if arguments already match new-style, no real transformation needed
    const [options] = args;
    return options;
  } else if (matchesLegacyArguments(args)) {
    return LegacyConstructor.toOptions(args);
  } else {
    throw new Error(
      "Unknown arguments format passed to new HDWalletProvider. Please check your configuration and try again"
    );
  }
};

class HDWalletProvider {
  private hdwallet?: EthereumHDKey;
  private walletHdpath: string;
  private wallets: { [address: string]: ethJSWallet };
  private addresses: string[];

  public engine: ProviderEngine;

  constructor(...args: ConstructorArguments) {
    const {
      providerOrUrl, // required
      addressIndex = 0,
      numberOfAddresses = 10,
      shareNonce = true,
      derivationPath = `m/44'/60'/0'/0/`,

      // what's left is either a mnemonic or a list of private keys
      ...signingAuthority
    } = getOptions(...args);

    const mnemonic = NewConstructor.getMnemonic(signingAuthority);
    const privateKeys = NewConstructor.getPrivateKeys(signingAuthority);

    this.walletHdpath = derivationPath;
    this.wallets = {};
    this.addresses = [];
    this.engine = new ProviderEngine();

    if (!HDWalletProvider.isValidProvider(providerOrUrl)) {
      throw new Error(
        [
          `Malformed provider URL: '${providerOrUrl}'`,
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
      password?: string;
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

    if (mnemonic && mnemonic.phrase) {
      checkBIP39Mnemonic(mnemonic);
    } else if (privateKeys) {
      ethUtilValidation(privateKeys);
    } // no need to handle else case here, since matchesNewOptions() covers it

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

    !shareNonce
      ? this.engine.addProvider(new NonceSubProvider())
      : this.engine.addProvider(singletonNonceSubProvider);

    this.engine.addProvider(new FiltersSubprovider());
    if (typeof providerOrUrl === "string") {
      const url = providerOrUrl;

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
      const provider = providerOrUrl;
      this.engine.addProvider(new ProviderSubprovider(provider));
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
