const Blockchain = {
  getBlockByNumber(blockNumber, provider, callback) {
    const params = [blockNumber, true];
    provider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params,
        id: Date.now()
      },
      callback
    );
  },

  getBlockByHash(blockHash, provider, callback) {
    const params = [blockHash, true];
    provider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getBlockByHash",
        params,
        id: Date.now()
      },
      callback
    );
  },

  parse(uri) {
    const parsed = {};
    if (uri.indexOf("blockchain://") !== 0) return parsed;

    uri = uri.replace("blockchain://", "");

    const pieces = uri.split("/block/");

    parsed.genesis_hash = `0x${pieces[0]}`;
    parsed.block_hash = `0x${pieces[1]}`;

    return parsed;
  },

  asURI(provider, callback) {
    const self = this;
    let genesis;

    self.getBlockByNumber("0x0", provider, (err, { result }) => {
      if (err) return callback(err);
      genesis = result;

      self.getBlockByNumber("latest", provider, (err, { result }) => {
        if (err) return callback(err);
        latest = result;
        const url = `blockchain://${genesis.hash.replace(
          "0x",
          ""
        )}/block/${latest.hash.replace("0x", "")}`;
        callback(null, url);
      });
    });
  },

  matches(uri, provider, callback) {
    const self = this;
    uri = self.parse(uri);

    const expected_genesis = uri.genesis_hash;
    const expected_block = uri.block_hash;

    self.getBlockByNumber("0x0", provider, (err, { result }) => {
      if (err) return callback(err);
      const block = result;
      if (block.hash !== expected_genesis) return callback(null, false);

      self.getBlockByHash(expected_block, provider, (err, { result }) => {
        // Treat an error as if the block didn't exist. This is because
        // some clients respond differently.
        const block = result;
        if (err || block == null) {
          return callback(null, false);
        }

        callback(null, true);
      });
    });
  }
};

module.exports = Blockchain;
