const Ganache = require("ganache-core");
const assert = require("assert");
const WalletProvider = require("../src/index.js");
const EthUtil = require("newchainjs-util");

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
      "0x3bdb7a8f066a3ac5ebb30be9ae8d979a1a10c7a4",
      "0x80c4c4eb8575fde8f034eae47a2185c3ad5b8b2d",
      "0x1017e752ca0fa9be617b7e5cc22b45e310533c64",
      "0x1da8e1bb32c9f1b4374ac58b05b1f3e196ef3c1a",
      "0xf92cc0410eca6fce10c61e4a15c7a35d5e2ba96c",
      "0x36456b4c64d50cf3e9d0afb525975897e0cb744f",
      "0xeecf554104ada447834cb4f66fff3d2ebd2aafb1",
      "0x502aaaf58f94ba566da0b7a45bc72f351ee9f74b",
      "0x21ac36744f99a4b663fb4bd54d512958b5121ccd",
      "0x1d9948fc3b4dddfd31ef9b68043dd223fb893760"
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
    assert.equal(addresses[0], "0xe61da4c2aa40b4b6e35239e3eace8eaf8b367df3");
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
      "0xe61da4c2aa40b4b6e35239e3eace8eaf8b367df3":
        "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
      "0x98acfa6cee067eebb36e66daf1c7ec0dcc5b8021":
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
