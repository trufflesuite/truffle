const assert = require("chai").assert;
const sinon = require("sinon");
const accountsInfo = require("../../../lib/mnemonics/mnemonic");
const Configstore = require("configstore");

describe("mnemonic", function() {
  beforeEach(() => {
    sinon
      .stub(Configstore.prototype, "get")
      .returns(
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
      );
    sinon.stub(Configstore.prototype, "set");
  });
  afterEach(() => {
    Configstore.prototype.get.restore();
    Configstore.prototype.set.restore();
  });
  describe("#getOrGenerateMnemonic", function() {
    it("checks user-level configuration for mnemonic and creates one if one is not present", function() {
      let mnemonic = accountsInfo.getOrGenerateMnemonic();
      sinon.assert.calledOnce(Configstore.prototype.get);
      assert.exists(mnemonic);
      assert.isString(mnemonic);
      assert.equal(mnemonic, Configstore.prototype.get("mnemonic"));
    });
  });
  describe("#getAccountsInfo", function() {
    it("returns public keys, private keys, and mnemonic for default user account", function() {
      let defaultNumAddresses = 10;
      let accounts = accountsInfo.getAccountsInfo(defaultNumAddresses);
      assert.exists(accounts);
      assert.isObject(accounts);
      assert.isArray(accounts.accounts);
      assert.lengthOf(accounts.accounts, defaultNumAddresses);
      assert.isArray(accounts.privateKeys);
      assert.isString(accounts.mnemonic);
      sinon.assert.calledOnce(Configstore.prototype.get);
    });
  });
});
