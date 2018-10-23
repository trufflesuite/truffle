const assert = require('assert');
const HDWalletProvider = require('../index.js');

const truffleDevMnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("HDWalletProvider test", function () {
  context("check valid mnemonic", function () {
    const invalidErrorMessage = "Mnemonic invalid or undefined";
    it("success", function () {
      const provider = new HDWalletProvider(truffleDevMnemonic, "http://localhost:8545", 0, 1);
      assert(provider);
    });

    it("undefined is invalid.", function () {
      try {
        const provider = new HDWalletProvider(undefined, "http://localhost:8545", 0, 1);
        assert.fail("undefined mnemonic is invalid!");
      } catch(e) {
        assert.equal(e.message, invalidErrorMessage);
      }
    });

    it("unknown keywords is invalid.", function () {
      try {
        const provider = new HDWalletProvider("takoyaki is delicious", "http://localhost:8545", 0, 1);
        assert.fail("undefined mnemonic is invalid!");
      } catch(e) {
        assert.equal(e.message, invalidErrorMessage);
      }
    });
  });

  context("same to truffle dev accounts", function () {
    const truffleDevAccounts = [
      "0x627306090abab3a6e1400e9345bc60c78a8bef57",
      "0xf17f52151ebef6c7334fad080c5704d77216b732",
      "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
      "0x821aea9a577a9b44299b9c15c88cf3087f3b5544",
      "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2",
      "0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e",
      "0x2191ef87e392377ec08e7c08eb105ef5448eced5",
      "0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5",
      "0x6330a553fc93768f612722bb8c2ec78ac90b3bbc",
      "0x5aeda56215b167893e80b4fe645ba6d5bab767de"
    ];
    it("create from mnemonic", function () {
      const provider = new HDWalletProvider(truffleDevMnemonic, "http://localhost:8545", 0, 10);
      assert.deepEqual(provider.getAddresses(), truffleDevAccounts);
    });
  });

});
