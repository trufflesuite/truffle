const assert = require("chai").assert;
const fs = require("fs-extra");
const glob = require("glob");
const { default: Box } = require("@truffle/box");
const Profiler = require("../../dist/profiler");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");

describe("profiler", function () {
  var config;

  before("Create a sandbox", async function () {
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

  it("profiles example project successfully", async function () {
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
