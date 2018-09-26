/**
* @module mnemonic;
* @requires module:Configstore
* @requires module:random
* @requires module:bip39
* @requires module:ethereumjs-wallet/hdkey
*/

const Configstore = require('configstore');
const random = require('./random');
const seedrandom = require('seedrandom');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');

const mnemonic = {

	/**
  * gets user-level mnemonic from user config, and if missing generates a new mnemonic
  * @returns { String } mnemonic
  */
	mnemonic: function () {
		let mnemonic;
		
		const defaultUserConfig = new Configstore('truffle', {}, { globalConfigPath: true });
		const userMnemonicExists = defaultUserConfig.get("mnemonic");
		if(!userMnemonicExists) {
			let seed = random.randomAlphaNumericString(10, seedrandom());
			let randomBytes = random.randomBytes(16, seedrandom(seed));
			mnemonic = bip39.entropyToMnemonic(randomBytes.toString("hex"));
			defaultUserConfig.set({"mnemonic": mnemonic});
		} else {
			mnemonic = defaultUserConfig.get("mnemonic");
		}

		return mnemonic;
	},

	/**
  * gets accounts object using mnemonic 
  * @param { String }   
  * @returns { Object } mnemonicObject
  */
	getAccountsInfo: function () {
		let self = this;

		let mnemonic = self.mnemonic();
		let accounts = [];
		let privateKeys = [];
		let mnemonicObject = {};

		let hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
		let address_index=0;
		let num_addresses=10;
		let wallet_hdpath = "m/44'/60'/0'/0/";


		for (let i = address_index; i < address_index + num_addresses; i++) {
			let wallet = hdwallet.derivePath(wallet_hdpath + i).getWallet();
			let addr = '0x' + wallet.getAddress().toString('hex');
			let privKey = wallet.getPrivateKey().toString('hex');
			accounts.push(addr);
			privateKeys.push(privKey);
		}

		mnemonicObject.mnemonic = mnemonic; 
		mnemonicObject.accounts = accounts;
		mnemonicObject.privateKeys = privateKeys;
		
		return mnemonicObject;

	}

}

module.exports = mnemonic;