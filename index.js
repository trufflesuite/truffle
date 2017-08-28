var bip39 = require("bip39");
var hdkey = require('ethereumjs-wallet/hdkey');
var ProviderEngine = require("web3-provider-engine");
var FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
var WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
var HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
var Web3Subprovider = require("web3-provider-engine/subproviders/web3.js");
var Web3 = require("web3");

function HDWalletProvider(mnemonic, provider_url, address_index=0, num_addresses=1) {
  this.mnemonic = mnemonic;
  this.hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
  this.wallet_hdpath = "m/44'/60'/0'/0/";
  this.wallets = {};
  this.addresses = [];

  for (let i = 0; i < num_addresses; i++){
    var wallet = this.hdwallet.derivePath(this.wallet_hdpath + i).getWallet();
    var addr = wallet.getAddress().toString('hex');
    this.addresses.push(addr);
    this.wallets[addr] = wallet;
  }

  this.engine = new ProviderEngine();
  this.engine.addProvider(new HookedSubprovider({
    getAccounts: function(cb) { cb(null, this.addresses) },
    getPrivateKey: function(address, cb) {
      if (!this.wallets[address]) { return cb('Account not found'); }
      else { cb(null, wallets[address].getPrivateKey().toString('hex')); }
    }
  }));
  // this.engine.addProvider(new WalletSubprovider(this.wallets[this.addresses[0]], {}));
  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(provider_url)));
  this.engine.start(); // Required by the provider engine.
};

HDWalletProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

HDWalletProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

// returns the address of the given address_index, first checking the cache
HDWalletProvider.prototype.getAddress = function(idx) {
  console.log('getting addresses', this.addresses[0], idx)
  if (!idx) { return this.addresses[0]; }
  else { return this.addresses[idx]; }
}

// returns the addresses cache
HDWalletProvider.prototype.getAddresses = function() {
  return this.addresses;
}

module.exports = HDWalletProvider;
