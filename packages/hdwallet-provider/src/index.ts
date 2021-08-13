import * as bip39 from "ethereum-cryptography/bip39";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english";
import * as EthUtil from "ethereumjs-util";
import ethJSWallet from "ethereumjs-wallet";
import { hdkey as EthereumHDKey } from "ethereumjs-wallet";
import { Transaction } from "@ethereumjs/tx";
import Common from "@ethereumjs/common";

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
import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from "ethereum-protocol";
import type { Callback, JsonRPCResponse } from "web3/providers";
import type { ConstructorArguments } from "./constructor/ConstructorArguments";
import { getOptions } from "./constructor/getOptions";
import { getPrivateKeys } from "./constructor/getPrivateKeys";
import { getMnemonic } from "./constructor/getMnemonic";
import type { ChainId, ChainSettings, Hardfork } from "./constructor/types";
import { signTypedData } from "eth-sig-util";

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
  private chainId?: ChainId;
  private chainSettings: ChainSettings;
  private hardfork: Hardfork;
  private initialized: Promise<void>;

  public engine: ProviderEngine;

  constructor(...args: ConstructorArguments) {
    const {
      providerOrUrl, // required
      addressIndex = 0,
      numberOfAddresses = 10,
      shareNonce = true,
      derivationPath = `m/44'/60'/0'/0/`,
      pollingInterval = 4000,
      chainId,
      chainSettings = {},

      // what's left is either a mnemonic or a list of private keys
      ...signingAuthority
    } = getOptions(...args);

    const mnemonic = getMnemonic(signingAuthority);
    const privateKeys = getPrivateKeys(signingAuthority);

    this.walletHdpath = derivationPath;
    this.wallets = {};
    this.addresses = [];
    this.chainSettings = chainSettings;
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

    if (this.addresses.length === 0) {
      throw new Error(
        `Could not create addresses from your mnemonic or private key(s). ` +
          `Please check that your inputs are correct.`
      );
    }

    const tmpAccounts = this.addresses;
    const tmpWallets = this.wallets;

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
        : "istanbul";

    const self = this;
    this.engine.addProvider(
      new HookedSubprovider({
        getAccounts(cb: any) {
          cb(null, tmpAccounts);
        },
        getPrivateKey(address: string, cb: any) {
          if (!tmpWallets[address]) {
            return cb("Account not found");
          } else {
            cb(null, tmpWallets[address].getPrivateKey().toString("hex"));
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
            pkey = tmpWallets[from].getPrivateKey();
          } else {
            cb("Account not found");
          }
          const chain = self.chainId;
          const KNOWN_CHAIN_IDS = new Set([1, 3, 4, 5, 42]);
          let txOptions;
          if (typeof chain !== "undefined" && KNOWN_CHAIN_IDS.has(chain)) {
            txOptions = { common: new Common({ chain }) };
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
          const tx = Transaction.fromTxData(txParams, txOptions);
          const signedTx = tx.sign(pkey as Buffer);
          const rawTx = `0x${signedTx.serialize().toString("hex")}`;
          cb(null, rawTx);
        },
        signMessage({ data, from }: any, cb: any) {
          const dataIfExists = data;
          if (!dataIfExists) {
            cb("No data to sign");
          }
          if (!tmpWallets[from]) {
            cb("Account not found");
          }
          let pkey = tmpWallets[from].getPrivateKey();
          const dataBuff = EthUtil.toBuffer(dataIfExists);
          const msgHashBuff = EthUtil.hashPersonalMessage(dataBuff);
          const sig = EthUtil.ecsign(msgHashBuff, pkey);
          const rpcSig = EthUtil.toRpcSig(sig.v, sig.r, sig.s);
          cb(null, rpcSig);
        },
        signPersonalMessage(...args: any[]) {
          this.signMessage(...args);
        },
        signTypedMessage({ data, from }: any, cb: any) {
          const dataIfExists = data;
          if (!dataIfExists) {
            cb("No data to sign");
          }
          if (!tmpWallets[from]) {
            cb("Account not found");
          }
          const pkey = tmpWallets[from].getPrivateKey();
          const sig = signTypedData(pkey, { data });
          cb(null, sig);
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

  private initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.engine.sendAsync(
        {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_chainId",
          params: []
        },
        (error: any, response: JSONRPCResponsePayload & { error?: any }) => {
          if (error) {
            reject(error);
            return;
          } else if (response.error) {
            reject(response.error);
            return;
          }
          if (isNaN(parseInt(response.result, 16))) {
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
        const wallet = ethJSWallet.fromPrivateKey(privateKey);
        const address = wallet.getAddressString();
        this.addresses.push(address);
        this.wallets[address] = wallet;
      }
    }
  }

  public send(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    this.initialized.then(() => {
      this.engine.send(payload, callback);
    });
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    this.initialized.then(() => {
      this.engine.sendAsync(payload, callback);
    });
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
