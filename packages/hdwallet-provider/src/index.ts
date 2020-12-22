import "source-map-support/register";
import * as bip39 from "ethereum-cryptography/bip39";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english";
import * as EthUtil from "ethereumjs-util";
import ethJSWallet from "ethereumjs-wallet";
import { hdkey as EthereumHDKey } from "ethereumjs-wallet";
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
import { ConstructorArguments } from "./constructor/ConstructorArguments";
import { getOptions } from "./constructor/getOptions";
import { getPrivateKeys } from "./constructor/getPrivateKeys";
import { getMnemonic } from "./constructor/getMnemonic";

// Important: do not use debug module. Reason: https://github.com/trufflesuite/truffle/issues/2374#issuecomment-536109086

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
const singletonNonceSubProvider = new NonceSubProvider();

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
      pollingInterval = 4000,

      // what's left is either a mnemonic or a list of private keys
      ...signingAuthority
    } = getOptions(...args);

    const mnemonic = getMnemonic(signingAuthority);
    const privateKeys = getPrivateKeys(signingAuthority);

    this.walletHdpath = derivationPath;
    this.wallets = {};
    this.addresses = [];
    this.engine = new ProviderEngine({
      pollingInterval
    });

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

    if (this.addresses.length === 0) {
      throw new Error(
        `Could not create addresses from your mnemonic or private key(s). ` +
          `Please check that your inputs are correct.`
      );
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

export = HDWalletProvider;
