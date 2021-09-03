const assert = require("chai").assert;
const sinon = require("sinon");
const accountsInfo = require("../../../lib/mnemonics/mnemonic");
const Conf = require("conf");
let conf;

describe("mnemonic", function() {
  describe("#getOrGenerateMnemonic", function() {
    it("returns the mnemonic set in the config", function() {
      const result = accountsInfo.getOrGenerateMnemonic();
      assert.exists(result);
      assert.isString(result);
    });
  });
  describe("#getAccountsInfo", function() {
    it("returns public keys, private keys, and mnemonic for default user account", function() {
      const defaultNumAddresses = 10;
      const accounts = accountsInfo.getAccountsInfo(defaultNumAddresses);
      assert.exists(accounts);
      assert.isObject(accounts);
      assert.isArray(accounts.accounts);
      assert.lengthOf(accounts.accounts, defaultNumAddresses);
      assert.isArray(accounts.privateKeys);
      assert.isString(accounts.mnemonic);
    });
  });
});
