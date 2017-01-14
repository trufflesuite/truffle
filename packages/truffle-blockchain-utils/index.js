// TODO: remove web3 requirement
// Call functions directly on the provider.
var Web3 = require("web3");

var Blockchain = {
  parse: function(uri) {
    var parsed = {};
    if (uri.indexOf("blockchain://") != 0) return parsed;

    uri = uri.replace("blockchain://", "");

    var pieces = uri.split("/block/");

    parsed.genesis_hash = "0x" + pieces[0];
    parsed.block_hash = "0x" + pieces[1];

    return parsed;
  },

  asURI: function(provider, callback) {
    var web3 = new Web3(provider);

    web3.eth.getBlock(0, function(err, genesis) {
      if (err) return callback(err);

      web3.eth.getBlock("latest", function(err, latest) {
        if (err) return callback(err);

        var url = "blockchain://" + genesis.hash.replace("0x", "") + "/block/" + latest.hash.replace("0x", "");

        callback(null, url);
      });
    });
  },

  matches: function(uri, provider, callback) {
    uri = this.parse(uri);

    var expected_genesis = uri.genesis_hash;
    var expected_block = uri.block_hash;

    var web3 = new Web3(provider);

    web3.eth.getBlock(0, function(err, block) {
      if (err) return callback(err);
      if (block.hash != expected_genesis) return callback(null, false);

      web3.eth.getBlock(expected_block, function(err, block) {
        // Treat an error as if the block didn't exist. This is because
        // some clients respond differently.
        if (err || block == null) {
          return callback(null, false);
        }

        callback(null, true);
      });
    });
  }
};

module.exports = Blockchain;
