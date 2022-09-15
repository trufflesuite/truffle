/**
 * @module mnemonic;
 * @requires module:@truffle/config
 * @requires module:seedrandom
 * @requires module:ethereum-cryptography
 * @requires module:@truffle/hdwallet
 * @requires module:crypto
 */

const Config = require("@truffle/config");
const defaultUserConfig = Config.getUserConfig();
const {
  entropyToMnemonic,
  mnemonicToSeedSync
} = require("ethereum-cryptography/bip39");
const { wordlist } = require("ethereum-cryptography/bip39/wordlists/english");
const crypto = require("crypto");
const {
  createAccountGeneratorFromSeedAndPath,
  uncompressedPublicKeyToAddress
} = require("@truffle/hdwallet");

const mnemonic = {
  /**
   * gets user-level mnemonic from user config, and if missing generates a new mnemonic
   * @returns {String} mnemonic
   */
  getOrGenerateMnemonic: function () {
    let mnemonic;
    const userMnemonicExists = defaultUserConfig.get("mnemonic");
    if (!userMnemonicExists) {
      mnemonic = entropyToMnemonic(crypto.randomBytes(16), wordlist);
      defaultUserConfig.set({ mnemonic: mnemonic });
    } else {
      mnemonic = userMnemonicExists;
    }

    return mnemonic;
  },

  /**
   * gets accounts object using mnemonic
   * @param {String}
   * @returns {Object} mnemonicObject
   */
  getAccountsInfo: function (numAddresses) {
    let mnemonic = this.getOrGenerateMnemonic();
    let accounts = [];
    let privateKeys = [];

    let walletHdpath = "m/44'/60'/0'/0".split("/");
    let hdwallet = createAccountGeneratorFromSeedAndPath(
      Buffer.from(mnemonicToSeedSync(mnemonic)),
      walletHdpath
    );
    let addressIndex = 0;

    for (let i = addressIndex; i < addressIndex + numAddresses; i++) {
      let wallet = hdwallet(i);
      let addr = `0x${Buffer.from(
        uncompressedPublicKeyToAddress(wallet.publicKey)
      ).toString("hex")}`;
      let privKey = wallet.privateKey.toString("hex");
      accounts.push(addr);
      privateKeys.push(privKey);
    }

    return {
      mnemonic,
      accounts,
      privateKeys
    };
  }
};

module.exports = mnemonic;
