import { assert } from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import { Profiler } from "../../dist/profiler";
import { Resolver } from "@truffle/resolver";
import TruffleConfig from "@truffle/config";
const Artifactor = require("@truffle/artifactor");

function createSandbox(source) {
  if (!fs.existsSync(source)) {
    throw new Error(`Sandbox failed: source: ${source} does not exist`);
  }

  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  fs.copySync(source, tempDir.name);
  const config = TruffleConfig.load(
    path.join(tempDir.name, "truffle-config.js"),
    {}
  );
  return config;
}

describe("profiler", function () {
  var config;

  before("Create a sandbox", function () {
    config = createSandbox(
      path.join(__dirname, "..", "fixture", "default-box")
    );
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.network = "development";
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
