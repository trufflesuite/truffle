var assert = require("chai").assert;
var fs = require("fs-extra");
var glob = require("glob");
var Box = require("@truffle/box");
var Profiler = require("@truffle/compile-solidity/profiler");
var Resolver = require("@truffle/resolver");
var Artifactor = require("@truffle/artifactor");

// TOOD: Move this to @truffle/compile-solidity!

describe("profiler", function() {
  var config;

  before("Create a sandbox", async function() {
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.network = "development";
  });

  after("Cleanup tmp files", function (done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  it("profiles example project successfully", async function() {
    const { allSources, compilationTargets } = await Profiler.requiredSources(
      config.with({
        paths: ["./ConvertLib.sol"],
        base_path: config.contracts_directory
      })
    );
    assert.equal(Object.keys(allSources).length, 2);
    assert.equal(compilationTargets.length, 2);
  });
}).timeout(10000);
