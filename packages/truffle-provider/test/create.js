var assert = require("assert");
var Web3 = require("web3");
var TestRPC = require("ethereumjs-testrpc");
var Provider = require("../index");

describe("Provider", function() {
  var HttpProvider;

  beforeEach("mock HttpProvider", function() {
    HttpProvider = Web3.providers.HttpProvider;
    Web3.providers.HttpProvider = TestRPC.provider;
  });

  afterEach("unmock HttpProvider", function() {
    Web3.providers.HttpProvider = HttpProvider;
  });

  it("accepts host and port", function(done) {
    var provider = Provider.create({host: "0.0.0.0", port: "8545"});
    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert.ifError(error);
      done();
    });
  });

  it("accepts a provider instance", function(done) {
    var provider = Provider.create({provider: new TestRPC.provider()});
    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert.ifError(error);
      done();
    });
  });

  it("accepts a function that returns a provider instance", function(done) {
    var provider = Provider.create({
      provider: function() { return new TestRPC.provider()}
    });

    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert.ifError(error);
      done();
    });
  });
});
