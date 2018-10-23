const Ganache = require('ganache-core');
const assert = require('assert');
const WalletProvider = require('../index.js');
const EthUtil = require('ethereumjs-util');

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
    setTimeout(() => server.close(done), 2000); // :/
  });

  afterEach(() => {
    provider.engine.stop();
  });

  it('provides for a mnemonic', function(done){
    const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat';
    provider = new WalletProvider(mnemonic, `http://localhost:${port}`);
    web3.setProvider(provider);

    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  });

  it('provides for a private key', function(done){
    const privateKey = '3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580'; //random valid private key generated with ethkey
    provider = new WalletProvider(privateKey, `http://localhost:${port}`);
    web3.setProvider(provider);

    const addresses = provider.getAddresses();
    assert.equal(addresses[0], '0xc515db5834d8f110eee96c3036854dbf1d87de2b');
    addresses.forEach((address) => {
      assert(EthUtil.isValidAddress(address), 'invalid address');
    });


    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  });

  it('provides for an array of private keys', function(done){
    const privateKeys = [
      '3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580',
      '9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290',
    ];

    const privateKeysByAddress = {
      '0xc515db5834d8f110eee96c3036854dbf1d87de2b': '3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580',
      '0xbd3366a0e5d2fb52691e3e08fabe136b0d4e5929': '9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290',
    };


    provider = new WalletProvider(privateKeys, `http://localhost:${port}`, 0, privateKeys.length); //pass in num_addresses to load full array
    web3.setProvider(provider);

    const addresses = provider.getAddresses();
    assert.equal(addresses.length, privateKeys.length, 'incorrect number of wallets derived');
    addresses.forEach((address) => {
      assert(EthUtil.isValidAddress(address), 'invalid address');
      const privateKey = new Buffer(privateKeysByAddress[address], 'hex');
      const expectedAddress = `0x${EthUtil.privateToAddress(privateKey).toString('hex')}`;
      assert.equal(address, expectedAddress, 'incorrect address for private key');
    });


    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  });
});

