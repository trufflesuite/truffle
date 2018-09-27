const assert = require("chai").assert;
const accountsInfo = require("../lib/mnemonics/mnemonic");
const Config = require('truffle-config');
const defaultUserConfig = Config.getUserConfig();


describe("mnemonic", function() {
  describe("#getOrGenerateMnemonic", function(){
    it("checks user-level configuration for mnemonic and creates one if one is not present", function(done) {
      this.timeout(30000);
      
      let mnemonic = accountsInfo.getOrGenerateMnemonic();
      assert.exists(mnemonic);
      assert.isString(mnemonic);
      assert.equal(mnemonic, defaultUserConfig.get('mnemonic'));
      done();
    });
  });
  describe("#getAccountsInfo", function(){
    it("returns public keys, private keys, and mnemonic for default user account", function(done) {
      this.timeout(30000);  

      let accounts = accountsInfo.getAccountsInfo();
      assert.exists(accounts);
      assert.isObject(accounts);
      assert.isArray(accounts.accounts);
      assert.isArray(accounts.privateKeys);
      assert.isString(accounts.mnemonic);
      done();

    });
  });
});
