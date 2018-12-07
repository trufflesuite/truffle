var assert = require("assert");
var Ganache = require("ganache-core");
var Provider = require("../index");

describe("Provider", function() {
  var server;
  var port = 12345;

  before("Initialize Ganache server", function(done) {
    server = Ganache.server({});
    server.listen(port, function (err) {
      assert.ifError(err);
      done();
    });
  });

  after("Shutdown Ganache", function(done) {
    server.close(done);
  });

  it("accepts host and port", function(done) {
    var provider = Provider.create({host: "0.0.0.0", port: port});
    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert.ifError(error);
      done();
    });
  });

  it("fails to connect to the wrong port", function(done) {
    var provider = Provider.create({host: "0.0.0.0", port: "54321"});
    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert(error);
      done();
    });
  });

  it("accepts a provider instance", function(done) {
    var provider = Provider.create({provider: new Ganache.provider()});
    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert.ifError(error);
      done();
    });
  });

  it("accepts a function that returns a provider instance", function(done) {
    var provider = Provider.create({
      provider: function() { return new Ganache.provider(); }
    });

    assert(provider);

    Provider.test_connection(provider, function(error, coinbase) {
      assert.ifError(error);
      done();
    });
  });
});
