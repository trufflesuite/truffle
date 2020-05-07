import "source-map-support/register";
import * as bip39 from "bip39";
import * as EthUtil from "ethereumjs-util";
import ethJSWallet from "ethereumjs-wallet";
import EthereumHDKey from "ethereumjs-wallet/hdkey";
import Transaction from "ethereumjs-tx";
import ProviderEngine from "web3-provider-engine";
import FiltersSubprovider from "web3-provider-engine/subproviders/filters";
import NonceSubProvider from "web3-provider-engine/subproviders/nonce-tracker";
import HookedSubprovider from "web3-provider-engine/subproviders/hooked-wallet";
import ProviderSubprovider from "web3-provider-engine/subproviders/provider";
import Url from "url";
import Web3 from "web3";
import { JSONRPCRequestPayload, JSONRPCErrorCallback } from "ethereum-protocol";
import { Callback, JsonRPCResponse } from "web3/providers";

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

  constructor(
    mnemonic: string | string[],
    provider: string | any,
    addressIndex: number = 0,
    numAddresses: number = 10,
    shareNonce: boolean = true,
    walletHdpath: string = `m/44'/60'/0'/0/`
  ) {
    this.walletHdpath = walletHdpath;
    this.wallets = {};
    this.addresses = [];
    this.engine = new ProviderEngine();

    if (!HDWalletProvider.isValidProvider(provider)) {
      throw new Error(
        [
          `Malformed provider URL: '${provider}'`,
          "Please specify a correct URL, using the http, https, ws, or wss protocol.",
          ""
        ].join("\n")
      );
    }

    // private helper to normalize given mnemonic
    const normalizePrivateKeys = (
      mnemonic: string | string[]
    ): string[] | false => {
      if (Array.isArray(mnemonic)) return mnemonic;
      else if (mnemonic && !mnemonic.includes(" ")) return [mnemonic];
      // if truthy, but no spaces in mnemonic
      else return false; // neither an array nor valid value passed;
    };

    // private helper to check if given mnemonic uses BIP39 passphrase protection
    const checkBIP39Mnemonic = (mnemonic: string) => {
      this.hdwallet = EthereumHDKey.fromMasterSeed(
        bip39.mnemonicToSeed(mnemonic)
      );

      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Mnemonic invalid or undefined");
      }

      // crank the addresses out
      for (let i = addressIndex; i < addressIndex + numAddresses; i++) {
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

    const privateKeys = normalizePrivateKeys(mnemonic);

    if (!privateKeys) checkBIP39Mnemonic(mnemonic as string);
    else ethUtilValidation(privateKeys);

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
    if (typeof provider === "string") {
      // shim Web3 to give it expected sendAsync method. Needed if web3-engine-provider upgraded!
      // Web3.providers.HttpProvider.prototype.sendAsync =
      // Web3.providers.HttpProvider.prototype.send;
      let subProvider;
      const providerProtocol = (
        Url.parse(provider).protocol || "http:"
      ).toLowerCase();

      switch (providerProtocol) {
        case "ws:":
        case "wss:":
          subProvider = new Web3.providers.WebsocketProvider(provider);
          break;
        default:
          // @ts-ignore: Incorrect typings in @types/web3
          subProvider = new Web3.providers.HttpProvider(provider, {
            keepAlive: false
          });
      }

      this.engine.addProvider(new ProviderSubprovider(subProvider));
    } else {
      this.engine.addProvider(new ProviderSubprovider(provider));
    }

    // Required by the provider engine.
    this.engine.start(err => {
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
