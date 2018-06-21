var assert = require("assert");
var Web3 = require("web3");
var Ganache = require("ganache-cli");
var pify = require("pify");
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

  describe('create', function() {
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

    it("throws on a Promise which resolves to a provider instance", function(done) {
      try {
        var provider = Provider.create({provider: new Ganache.provider()});
        assert.fail("Provider.create should throw when given a Promise instead of a provider");
      } catch(error) {
        done();
      }
    });

    it("accepts a synchronous function that returns a provider instance", function(done) {
      var provider = Provider.create({
        provider: function() { return new Ganache.provider()}
      });

      assert(provider);

      Provider.test_connection(provider, function(error, coinbase) {
        assert.ifError(error);
        done();
      });
    });

    it("throws on an asynchronous function that returns a provider instance", function(done) {
      try {
        var provider = Provider.create({
          provider: function() { return Promise.resolve(new Ganache.provider()) }
        });
        assert.fail("Provider.create should throw when given an asynchronous function which retrurns a provider instance");
      } catch(error) {
        done();
      }
    });
  });

  describe('createAsync', function() {
    it("accepts host and port", function() {
      return Provider.createAsync({host: "0.0.0.0", port: port}).then(function(provider) {
        assert(provider);
        return pify(Provider.test_connection)(provider);
      });
    });

    it("fails to connect to the wrong port", function() {
      return Provider.createAsync({host: "0.0.0.0", port: "54321"}).then(function(provider) {
        assert(provider);
        return pify(Provider.test_connection)(provider);
      }).then(function() {
        assert.fail("Should throw when trying to connect to a bad port");
      }).catch(function(error) {});
    });

    it("accepts a provider instance", function() {
      return Provider.createAsync({provider: new Ganache.provider()}).then(function(provider) {
        assert(provider);
        return pify(Provider.test_connection)(provider);
      });
    });

    it("accepts a promise which resolves to a provider instance", function() {
      return Provider.createAsync({
        provider: Promise.resolve(new Ganache.provider())
      }).then(function(provider) {
        assert(provider);
        return pify(Provider.test_connection)(provider);
      });
    });

    it("accepts a synchronous function that returns a provider instance", function() {
      return Provider.createAsync({
        provider: function() { return new Ganache.provider(); }
      }).then(function(provider) {
        assert(provider);
        return pify(Provider.test_connection)(provider);
      });
    });

    it("accepts an asynchronous function that returns a provider instance", function() {
      return Provider.createAsync({
        provider: function() { return new Ganache.provider(); }
      }).then(function(provider) {
        assert(provider);
        return pify(Provider.test_connection)(provider);
      });
    });
  });
});
