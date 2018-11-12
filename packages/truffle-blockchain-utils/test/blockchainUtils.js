const BlockchainUtils = require("../");
const TestRPC = require("ganache-core");
const assert = require("assert");

describe("Blockchain Utils", () => {
  let provider;
  let genesisBlock;

  before("Start TestRPC Provider", done => {
    provider = TestRPC.provider();
    done();
  });

  it(".getBlockByNumber returns block data", done => {
    BlockchainUtils.getBlockByNumber("0x0", provider, (err, response) => {
      if (err) return done(err);
      genesisBlock = response.result;
      let blockNumber = genesisBlock.number;
      assert(genesisBlock);
      assert.strictEqual(blockNumber, "0x0");
      done();
    });
  });

  it(".getBlockByHash returns block data", done => {
    BlockchainUtils.getBlockByHash(
      genesisBlock.hash,
      provider,
      (err, response) => {
        if (err) return done(err);
        let blockData = response.result;
        let blockNumber = blockData.number;
        assert(blockData);
        assert.strictEqual(blockNumber, "0x0");
        assert.deepEqual(blockData, genesisBlock);
        done();
      }
    );
  });

  it(".asURI returns the correct blockchain URI", done => {
    BlockchainUtils.asURI(provider, (err, uri) => {
      if (err) return done(err);
      assert(uri);

      BlockchainUtils.matches(uri, provider, (err, matches) => {
        if (err) return done(err);
        assert.strictEqual(matches, true);
      });

      done();
    });
  });

  it(".parse returns parsed hash values", done => {
    BlockchainUtils.asURI(provider, (err, uri) => {
      if (err) return done(err);
      const parsedURI = BlockchainUtils.parse(uri);
      assert(parsedURI);
      assert(parsedURI.genesis_hash);
      assert(parsedURI.block_hash);
      done();
    });
  });
});
