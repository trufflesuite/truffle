const Ganache = require('ganache-core');
const assert = require('assert');
const WalletProvider = require('../index.js');
const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat';

describe("HD Wallet Provider", function(done) {
  var Web3 = require('web3');
  var web3 = new Web3();
  var port = 8545;
  var server;
  var provider;

  before(done => {
    server = Ganache.server();
    server.listen(port, done);
  });

  after(done => {
    provider.engine.stop();
    setTimeout(() => server.close(done), 2000); // :/
  })

  it('provides', function(done){
    provider = new WalletProvider(mnemonic, `http://localhost:${port}`);
    web3.setProvider(provider);

    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  })
});

