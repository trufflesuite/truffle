const defaultJSONQuery = {
  jsonrpc: "2.0",
  method: "",
  params: [],
  id: Date.now()
};

const Blockchain = {
  getBlockByNumber(blockNumber, provider, callback) {
    defaultJSONQuery.params = [blockNumber, true];
    defaultJSONQuery.method = "eth_getBlockByNumber";
    provider.send(defaultJSONQuery, callback);
  },

  getBlockByHash(blockHash, provider, callback) {
    defaultJSONQuery.params = [blockHash, true];
    defaultJSONQuery.method = "eth_getBlockByHash";
    provider.send(defaultJSONQuery, callback);
  },

  parse(uri) {
    const parsed = {};
    if (uri.indexOf("blockchain://") !== 0) return parsed;

    const cleanUri = uri.replace("blockchain://", "");

    const pieces = cleanUri.split("/block/");

    parsed.genesis_hash = `0x${pieces[0]}`;
    parsed.block_hash = `0x${pieces[1]}`;

    return parsed;
  },

  asURI(provider, callback) {
    let genesis, latest;

    this.getBlockByNumber("0x0", provider, (err, { result }) => {
      if (err) return callback(err);
      genesis = result;

      this.getBlockByNumber("latest", provider, (err, { result }) => {
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
    const parsedUri = this.parse(uri);

    const expected_genesis = parsedUri.genesis_hash;
    const expected_block = parsedUri.block_hash;

    this.getBlockByNumber("0x0", provider, (err, { result }) => {
      if (err) return callback(err);
      const block = result;
      if (block.hash !== expected_genesis) return callback(null, false);

      this.getBlockByHash(expected_block, provider, (err, { result }) => {
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
