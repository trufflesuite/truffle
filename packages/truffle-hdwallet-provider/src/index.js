const bip39 = require("bip39");
const ethJSWallet = require("ethereumjs-wallet");
const hdkey = require("ethereumjs-wallet/hdkey");
const debug = require("debug")("truffle-hdwallet-provider");
const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require("web3-provider-engine/subproviders/filters.js");
const NonceSubProvider = require("web3-provider-engine/subproviders/nonce-tracker.js");
const HookedSubprovider = require("web3-provider-engine/subproviders/hooked-wallet.js");
const ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
const Web3 = require("web3");
const Transaction = require("ethereumjs-tx");
const ethUtil = require("ethereumjs-util");

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
const singletonNonceSubProvider = new NonceSubProvider();

function HDWalletProvider(
  mnemonic,
  provider,
  address_index = 0,
  num_addresses = 1,
  shareNonce = true,
  wallet_hdpath = "m/44'/60'/0'/0/"
) {
  if ((mnemonic && mnemonic.indexOf(" ") === -1) || Array.isArray(mnemonic)) {
    const privateKeys = Array.isArray(mnemonic) ? mnemonic : [mnemonic];
    this.wallets = {};
    this.addresses = [];

    for (let i = address_index; i < address_index + num_addresses; i++) {
      const privateKey = Buffer.from(privateKeys[i].replace("0x", ""), "hex");
      if (ethUtil.isValidPrivate(privateKey)) {
        const wallet = ethJSWallet.fromPrivateKey(privateKey);
        const address = wallet.getAddressString();
        this.addresses.push(address);
        this.wallets[address] = wallet;
      }
    }
  } else {
    this.hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
    this.wallet_hdpath = wallet_hdpath;
    this.wallets = {};
    this.addresses = [];

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Mnemonic invalid or undefined");
    }

    for (let i = address_index; i < address_index + num_addresses; i++) {
      const wallet = this.hdwallet
        .derivePath(this.wallet_hdpath + i)
        .getWallet();
      const addr = "0x" + wallet.getAddress().toString("hex");
      this.addresses.push(addr);
      this.wallets[addr] = wallet;
    }
  }

  const tmp_accounts = this.addresses;
  const tmp_wallets = this.wallets;

  this.engine = new ProviderEngine();
  this.engine.addProvider(
    new HookedSubprovider({
      getAccounts: function(cb) {
        cb(null, tmp_accounts);
      },
      getPrivateKey: function(address, cb) {
        if (!tmp_wallets[address]) {
          return cb("Account not found");
        } else {
          cb(null, tmp_wallets[address].getPrivateKey().toString("hex"));
        }
      },
      signTransaction: function(txParams, cb) {
        let pkey;
        const from = txParams.from.toLowerCase();
        if (tmp_wallets[from]) {
          pkey = tmp_wallets[from].getPrivateKey();
        } else {
          cb("Account not found");
        }
        const tx = new Transaction(txParams);
        tx.sign(pkey);
        const rawTx = "0x" + tx.serialize().toString("hex");
        cb(null, rawTx);
      },
      signMessage(message, cb) {
        const dataIfExists = message.data;
        if (!dataIfExists) {
          cb("No data to sign");
        }
        if (!tmp_wallets[message.from]) {
          cb("Account not found");
        }
        let pkey = tmp_wallets[message.from].getPrivateKey();
        const dataBuff = ethUtil.toBuffer(dataIfExists);
        const msgHashBuff = ethUtil.hashPersonalMessage(dataBuff);
        const sig = ethUtil.ecsign(msgHashBuff, pkey);
        const rpcSig = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
        cb(null, rpcSig);
      },
      signPersonalMessage() {
        this.signMessage(...arguments);
      }
    })
  );

  !shareNonce
    ? this.engine.addProvider(new NonceSubProvider())
    : this.engine.addProvider(singletonNonceSubProvider);

  this.engine.addProvider(new FiltersSubprovider());
  if (typeof provider === "string") {
    this.engine.addProvider(
      new ProviderSubprovider(
        new Web3.providers.HttpProvider(provider, { keepAlive: false })
      )
    );
  } else {
    this.engine.addProvider(new ProviderSubprovider(provider));
  }
  this.engine.start(); // Required by the provider engine.
}

HDWalletProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

HDWalletProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

// returns the address of the given address_index, first checking the cache
HDWalletProvider.prototype.getAddress = function(idx) {
  debug("getting addresses", this.addresses[0], idx);
  if (!idx) {
    return this.addresses[0];
  } else {
    return this.addresses[idx];
  }
};

// returns the addresses cache
HDWalletProvider.prototype.getAddresses = function() {
  return this.addresses;
};

module.exports = HDWalletProvider;
