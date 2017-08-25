var bip39 = require("bip39");
var hdkey = require('ethereumjs-wallet/hdkey');
var ProviderEngine = require("web3-provider-engine");
var FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
var WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
var Web3Subprovider = require("web3-provider-engine/subproviders/web3.js");
var Web3 = require("web3");

function HDWalletProvider(mnemonics, provider_url, address_index) {
  var self = this;

  // 'mnemonics' can either be a single string or an array of strings.
  if (typeof mnemonics == 'string') { this.mnemonics = [ mnemonics ]; }
  else { this.mnemonics = mnemonics; }

  this.hdwallets = [];
  // Create a hdwallet instance for each mnemonic.
  this.mnemonics.forEach(function(m) {
    // if (this.hdwallets === undefined) { this.hdwallets = []; }
    self.hdwallets.push(hdkey.fromMasterSeed(bip39.mnemonicToSeed(m)));
  })

  // Start a ProviderEngine and add a SubProvider for each wallet supplied.
  this.engine = new ProviderEngine();
  // Use the address index across all provided wallets.
  if (address_index == null) {
    address_index = 0;
  }
  this.wallet_hdpath = "m/44'/60'/0'/0/";

  this.hdwallets.forEach(function(w, i) {
    // add the subprovider
    var wallet = w.derivePath(self.wallet_hdpath + address_index).getWallet();
    self.engine.addProvider(new WalletSubprovider(wallet, {}));
    // Save the wallet/address if this is the first one
    if (i == 0) {
      self.wallet = wallet;
      self.address =  "0x" + wallet.getAddress().toString("hex");
    }
  })
  // Add the other SubProviders
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

HDWalletProvider.prototype.getAddress = function() {
  return this.address;
};

module.exports = HDWalletProvider;
