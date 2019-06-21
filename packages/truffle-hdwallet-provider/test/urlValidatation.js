const Ganache = require("ganache-core");
const assert = require("assert");
const WalletProvider = require("../src/index.js");

describe("HD Wallet Provider", () => {
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

  it("detects an invalid url endpoint", () => {
    try {
      const mnemonic = "";
      const badUrl = "ropsten.infura.io/v3/fe93a046954a42839acb5f235f123456";
      provider = new WalletProvider(mnemonic, badUrl, 4, 10);
      assert.fail("Should throw invalid provider url");
    } catch (e) {
      assert.equal(
        e.message,
        "Invalid url format. Did you specify the http or https protocol?"
      );
    }
  });

  describe("detects", () => {
    const mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

    afterEach(() => {
      web3.setProvider(null);
      provider.engine.stop();
    });

    it("a valid http url endpoint", done => {
      try {
        const goodUrl = `http://localhost:${port}`;
        provider = new WalletProvider(mnemonic, goodUrl, 4, 10);
        web3.setProvider(provider);

        web3.eth.getBlockNumber((_, number) => {
          assert(number === 0);
          done();
        });
      } catch (e) {
        assert.fail("Should not throw ");
      }
    });

    it("a valid https url endpoint", done => {
      try {
        const goodUrl = `https://localhost:${port}`;
        provider = new WalletProvider(mnemonic, goodUrl, 4, 10);
        web3.setProvider(provider);

        web3.eth.getBlockNumber((_, number) => {
          assert(number === 0);
          done();
        });
      } catch (e) {
        assert.fail("Should not throw ");
      }
    });
  });
});
