const CommandRunner = require("../commandrunner");
const MemoryLogger = require("../memorylogger");
const sandbox = require("../sandbox");
const assert = require("assert");
const path = require("path");
let config;

describe("truffle install [ @standalone ]", () => {
  var logger = new MemoryLogger();

  before(async () => {
    config = await sandbox.create(
      path.join(__dirname, "../../sources/install/init")
    );
    config.logger = logger;
  });

  it("unboxes successfully", async () => {
    try {
      // throws an error since there is no valid provider in truffle-config
      await CommandRunner.run(
        "install ipfs://QmcxvhkJJVpbxEAa6cgW3B6XwPJb79w9GpNUv2P2THUzZR",
        config
      );
    } catch (err) {
      var output = logger.contents();
    }

    assert(
      output.includes("Fetching package manifest"),
      "Should have started locating manifest"
    );
    //assert(theInstallDirExists);
  }).timeout(30000);
});
