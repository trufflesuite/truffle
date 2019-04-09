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
      "0xd07529d3a38e2c52b541617b3151ee99c5c3dcd0",
      "0xb82ba4e7b0b8908f031a305090899447093bf1c2",
      "0xefd7ab9c0b80133670b916bd145e7e67cf4fafa5",
      "0xf68fbb8a87c8bf75a02e834eab3ce6cbfcff5db6",
      "0x6504e34c1bbdd61ac4ce9a616c8e8aec5441ecf2",
      "0xdc12eb7cc7645e951505d9824aa3575e53131e6f",
      "0x598cf05905c16668348f4a795493f2ec370751af",
      "0xe8ad23f4b2cb5c9014fc78a0a0e46fbd2462583f",
      "0xb341a6c30340e7851d36d0ab35f93833b65d3893",
      "0xb1d0c1de9d64535d4932630959512f194ec0f36b"
    ];

    const mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    provider = new WalletProvider(mnemonic, `http://localhost:${port}`, 'testnet', 0, 10);

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
        "testnet",
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
      "testnet",
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
