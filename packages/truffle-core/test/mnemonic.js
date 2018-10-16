const assert = require("chai").assert;
const accountsInfo = require("../lib/mnemonics/mnemonic");
const Config = require('truffle-config');
const defaultUserConfig = Config.getUserConfig();


describe("mnemonic", function() {
  describe("#getOrGenerateMnemonic", function(){
    it("checks user-level configuration for mnemonic and creates one if one is not present", function() {
      let mnemonic = accountsInfo.getOrGenerateMnemonic();
      assert.exists(mnemonic);
      assert.isString(mnemonic);
      assert.equal(mnemonic, defaultUserConfig.get('mnemonic'));
    });
  });
  describe("#getAccountsInfo", function(){
    it("returns public keys, private keys, and mnemonic for default user account", function() {
      let defaultNumAddresses = 10;
      let accounts = accountsInfo.getAccountsInfo(defaultNumAddresses);
      assert.exists(accounts);
      assert.isObject(accounts);
      assert.isArray(accounts.accounts);
      assert.lengthOf(accounts.accounts, defaultNumAddresses);
      assert.isArray(accounts.privateKeys);
      assert.isString(accounts.mnemonic);
    });
  });
});
