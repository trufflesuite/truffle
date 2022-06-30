const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");
const log = console.log;

describe("truffle publish", function () {
  let config;
  const project = path.join(__dirname, "../../sources/ethpm");
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    await Server.start();
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
  });

  // This test only validates package assembly. We expect it to run logic up to the attempt to
  // publish to the network and fail.
  it.skip("Can locate all the sources to publish", function (done) {
    this.timeout(30000);

    CommandRunner.run("compile", config, function (err) {
      if (err) {
        log(logger.contents());
        return done(err);
      }
      assert(
        fs.existsSync(
          path.join(config.contracts_build_directory, "PLCRVoting.json")
        )
      );
      assert(
        fs.existsSync(path.join(config.contracts_build_directory, "EIP20.json"))
      );
      assert(
        fs.existsSync(path.join(config.contracts_build_directory, "Local.json"))
      );

      CommandRunner.run("publish", config, function (err) {
        var output = logger.contents();

        // We expect publication to be rejected by the client.
        if (!err) {
          log(output);
          done(err);
        }
        assert(
          output.includes("Uploading sources and publishing"),
          "Should have found sources"
        );
        done();
      });
    });
  });
});
