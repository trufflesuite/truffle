var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var sandbox = require("../sandbox");
var log = console.log;

function processErr(err, output) {
  if (err) {
    log(output);
    throw new Error(err);
  }
}

describe("truffle publish", () => {
  let config, projectPath;
  var logger = new MemoryLogger();

  before("before all setup", done => {
    projectPath = path.join(__dirname, "../../sources/ethpm");
    sandbox
      .create(projectPath)
      .then(conf => {
        config = conf;
        config.network = "ropsten";
        config.logger = logger;
      })
      .then(() => Server.start(done));
  });

  after(done => Server.stop(done));

  // This test only validates package assembly. We expect it to run logic up to the attempt to
  // publish to the network and fail.
  describe("With an ethpm package installed", () => {
    it.skip("Can locate all the sources to publish", async () => {
      await CommandRunner.run("compile", config);

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

      try {
        await CommandRunner.run("publish", config);
      } catch (error) {
        var output = logger.contents();
        processErr(error, output);
      }

      assert(
        output.includes("Uploading sources and publishing"),
        "Should have found sources"
      );
      done();
    }).timeout(30000);
  });
});
