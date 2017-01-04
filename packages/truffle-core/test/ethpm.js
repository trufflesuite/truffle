var assert = require("chai").assert;
var Init = require("../lib/init");
var fs = require("fs");
var path = require('path');
var mkdirp = require("mkdirp");
var async = require("async");
var Sources = require("../lib/sources.js");
var Contracts = require("../lib/contracts.js");
var Package = require("../lib/package.js");
var EthPM = require("ethpm");
var GithubExamples = require("ethpm/lib/indexes/github-examples");


describe('EthPM integration', function() {
  var config;
  var host;
  var registry;

  before("Create a sandbox", function(done) {
    this.timeout(5000);
    Init.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      done();
    });
  });

  before("Create a fake EthPM host and memory registry", function(done) {
    this.timeout(5000);

    GithubExamples.initialize(function(err, results) {
      if (err) return done(err);

      host = results.host;
      registry = results.registry;

      done();
    });
  });

  it("successfully installs from EthPM", function(done) {
    Package.install(config.with({
      ethpm: {
        host: host,
        registry: registry
      },
      package_name: "owned"
    }), function(err) {
      if (err) return done(err);

      console.log("whoo");
      done();
    });
  });

  // it('successfully finds the correct source via Sources lookup', function(done) {
  //   Sources.find("fake_source/contracts/Module.sol", config.sources, function(err, body) {
  //     if (err) return done(err);
  //
  //     assert.equal(body, moduleSource);
  //     done();
  //   });
  // });

  // it("errors when module does not exist from any source", function(done) {
  //   Sources.find("some_source/contracts/SourceDoesNotExist.sol", config.sources, function(err, body) {
  //     if (!err) {
  //       return assert.fail("Source lookup should have errored but didn't");
  //     }
  //
  //     assert.equal(err.message, "Could not find some_source/contracts/SourceDoesNotExist.sol from any sources");
  //     done();
  //   });
  // });
  //
  // it("contract compiliation successfully picks up modules and their dependencies", function(done) {
  //   this.timeout(10000);
  //
  //   Contracts.compile(config.with({
  //     quiet: true
  //   }), function(err, contracts) {
  //     if (err) return done(err);
  //
  //     var contractNames = Object.keys(contracts);
  //
  //     assert.include(contractNames, "Parent");
  //     assert.include(contractNames, "Module");
  //     assert.include(contractNames, "ModuleDependency");
  //
  //     done();
  //   })
  // });
});
