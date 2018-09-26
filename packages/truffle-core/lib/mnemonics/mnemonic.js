/**
* @module mnemonic;
* @requires module:truffle-config
* @requires module:random
* @requires module:bip39
* @requires module:ethereumjs-wallet/hdkey
* @requires module:crypto
*/

const Config = require('truffle-config');
const defaultUserConfig = Config.getUserConfig();
const seedrandom = require('seedrandom');
const bip39 = require('bip39'); 
const hdkey = require('ethereumjs-wallet/hdkey');
const crypto = require('crypto');

const getOrGenerateMnemonic = {

  /**
  * gets user-level mnemonic from user config, and if missing generates a new mnemonic
  * @returns {String} mnemonic
  */
  mnemonic: function () {
    let mnemonic;
    const userMnemonicExists = defaultUserConfig.get("mnemonic");
    if(!userMnemonicExists) {
      mnemonic = bip39.entropyToMnemonic(crypto.randomBytes(16).toString('hex'));
      defaultUserConfig.set({"mnemonic": mnemonic});
    } else {
      mnemonic = defaultUserConfig.get("mnemonic");
    }

    return mnemonic;
  },

  /**
  * gets accounts object using mnemonic 
  * @param {String}   
  * @returns {Object} mnemonicObject
  */
  getAccountsInfo: function () {

    let mnemonic = this.mnemonic();
    let accounts = [];
    let privateKeys = [];
    let mnemonicObject = {};

    let hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
    let addressIndex = 0;
    let numAddresses = 10;
    let walletHdpath = "m/44'/60'/0'/0/";

    for (let i = addressIndex; i < addressIndex + numAddresses; i++) {
      let wallet = hdwallet.derivePath(walletHdpath + i).getWallet();
      let addr = '0x' + wallet.getAddress().toString('hex');
      let privKey = wallet.getPrivateKey().toString('hex');
      accounts.push(addr);
      privateKeys.push(privKey);
    }

    return {
      mnemonic,
      accounts,
      privateKeys,
    };
  }
}

module.exports = getOrGenerateMnemonic;
