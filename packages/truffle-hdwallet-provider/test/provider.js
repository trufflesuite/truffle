const Ganache = require("ganache-core");
const assert = require("assert");
const WalletProvider = require("../src/index.js");
const EthUtil = require("ethereumjs-util");

describe("HD Wallet Provider", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  const port = 8545;
  let server;
  let provider;

  before(done => {
    server = Ganache.server();
    server.listen(port, done);
  });

  after(done => {
    setTimeout(() => server.close(done), 100);
  });

  afterEach(() => {
    web3.setProvider(null);
    provider.engine.stop();
  });

  it("provides for a mnemonic", function(done) {
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

    const mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    provider = new WalletProvider(mnemonic, `http://localhost:${port}`, 0, 10);

    assert.deepEqual(provider.getAddresses(), truffleDevAccounts);
    web3.setProvider(provider);

    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  });

  it("throws on invalid mnemonic", function(done) {
    try {
      provider = new WalletProvider(
        "takoyaki is delicious",
        "http://localhost:8545",
        0,
        1
      );
      assert.fail("Should throw on invalid mnemonic");
    } catch (e) {
      assert.equal(e.message, "Mnemonic invalid or undefined");
      done();
    }
  });

  it("provides for a private key", function(done) {
    const privateKey =
      "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580"; //random valid private key generated with ethkey
    provider = new WalletProvider(privateKey, `http://localhost:${port}`);
    web3.setProvider(provider);

    const addresses = provider.getAddresses();
    assert.equal(addresses[0], "0xc515db5834d8f110eee96c3036854dbf1d87de2b");
    addresses.forEach(address => {
      assert(EthUtil.isValidAddress(address), "invalid address");
    });

    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  });

  it("provides for an array of private keys", function(done) {
    const privateKeys = [
      "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
      "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290"
    ];

    const privateKeysByAddress = {
      "0xc515db5834d8f110eee96c3036854dbf1d87de2b":
        "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
      "0xbd3366a0e5d2fb52691e3e08fabe136b0d4e5929":
        "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290"
    };

    provider = new WalletProvider(
      privateKeys,
      `http://localhost:${port}`,
      0,
      privateKeys.length
    ); //pass in num_addresses to load full array
    web3.setProvider(provider);

    const addresses = provider.getAddresses();
    assert.equal(
      addresses.length,
      privateKeys.length,
      "incorrect number of wallets derived"
    );
    addresses.forEach(address => {
      assert(EthUtil.isValidAddress(address), "invalid address");
      const privateKey = Buffer.from(privateKeysByAddress[address], "hex");
      const expectedAddress = `0x${EthUtil.privateToAddress(
        privateKey
      ).toString("hex")}`;
      assert.equal(
        address,
        expectedAddress,
        "incorrect address for private key"
      );
    });

    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  });
});
